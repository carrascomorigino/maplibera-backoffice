import { computed, signal } from '@angular/core';
import { RESOURCE_CATEGORIES, Resource, ResourceCategory, ResourceStatus } from '../models/resource.model';
import { ContentLanguage } from '../../guide/models/content-language.model';
import { ResourceCreateInput } from '../services/resource.service';

let nextId = 0;

export function makeResource(overrides: Partial<Resource> = {}): Resource {
  const base = {
    id: `id-${++nextId}`,
    slug: 'resource',
    category: 'nutrition' as const,
    status: 'draft' as const,
    order: 0,
    sourceLinks: [],
    pdfUrls: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    translations: { en: { title: 'Resource', shortDescription: '', explanatoryText: '' } },
  };
  return { ...base, ...overrides } as Resource;
}

/** Component-level test double for ResourceService — see FakeSectionService for rationale. */
export class FakeResourceService {
  private readonly _resources = signal<Resource[]>([]);
  private readonly categoryOrder = new Map(RESOURCE_CATEGORIES.map((category, index) => [category, index]));

  readonly resources = computed(() =>
    [...this._resources()].sort((a, b) => {
      const categoryDiff =
        (this.categoryOrder.get(a.category) ?? 0) - (this.categoryOrder.get(b.category) ?? 0);
      return categoryDiff !== 0 ? categoryDiff : a.order - b.order;
    }),
  );

  readonly resourcesByCategory = computed<Record<ResourceCategory, Resource[]>>(() => {
    const groups: Record<ResourceCategory, Resource[]> = {
      nutrition: [],
      recipes: [],
      multimedia: [],
      apps: [],
    };
    for (const resource of this.resources()) {
      groups[resource.category].push(resource);
    }
    return groups;
  });

  seed(resources: Resource[]): void {
    this._resources.set(resources);
  }

  create = vi.fn(async (input: ResourceCreateInput): Promise<Resource> => {
    const order = this._resources().filter((r) => r.category === input.category).length;
    const resource = makeResource({
      slug: input.slug,
      category: input.category,
      order,
      translations: { [input.language]: input.translation },
      ...input.sharedFields,
    } as Partial<Resource>);
    this._resources.update((resources) => [...resources, resource]);
    return resource;
  });

  saveTranslation = vi.fn(
    async (
      id: string,
      language: ContentLanguage,
      translation: Resource['translations'][ContentLanguage],
      newSlug?: string,
    ): Promise<Resource> => {
      const current = this._resources().find((r) => r.id === id);
      if (!current) {
        throw new Error(`Unknown resource id: ${id}`);
      }
      const updated = {
        ...current,
        slug: newSlug ?? current.slug,
        translations: { ...current.translations, [language]: translation },
        updatedAt: new Date().toISOString(),
      } as Resource;
      this.replace(updated);
      return updated;
    },
  );

  removeTranslation = vi.fn(async (id: string, language: ContentLanguage): Promise<Resource> => {
    const current = this._resources().find((r) => r.id === id);
    if (!current) {
      throw new Error(`Unknown resource id: ${id}`);
    }
    const translations = { ...current.translations };
    delete translations[language];
    const updated = { ...current, translations, updatedAt: new Date().toISOString() } as Resource;
    this.replace(updated);
    return updated;
  });

  updateSharedFields = vi.fn(async (id: string, sharedFields: Record<string, unknown>): Promise<Resource> => {
    const current = this._resources().find((r) => r.id === id);
    if (!current) {
      throw new Error(`Unknown resource id: ${id}`);
    }
    const updated = { ...current, ...sharedFields, updatedAt: new Date().toISOString() } as Resource;
    this.replace(updated);
    return updated;
  });

  reorder = vi.fn(async (category: ResourceCategory, orderedIds: string[]): Promise<void> => {
    const orderById = new Map(orderedIds.map((id, index) => [id, index]));
    this._resources.update((resources) =>
      resources.map((resource) =>
        resource.category === category
          ? { ...resource, order: orderById.get(resource.id) ?? resource.order }
          : resource,
      ),
    );
  });

  delete = vi.fn(async (id: string): Promise<void> => {
    this._resources.update((resources) => resources.filter((r) => r.id !== id));
  });

  publish = vi.fn((id: string): Promise<Resource> => this.setStatus(id, 'published'));
  pause = vi.fn((id: string): Promise<Resource> => this.setStatus(id, 'paused'));

  private async setStatus(id: string, status: ResourceStatus): Promise<Resource> {
    const current = this._resources().find((r) => r.id === id);
    if (!current) {
      throw new Error(`Unknown resource id: ${id}`);
    }
    const updated = { ...current, status, updatedAt: new Date().toISOString() } as Resource;
    this.replace(updated);
    return updated;
  }

  private replace(updated: Resource): void {
    this._resources.update((resources) => resources.map((r) => (r.id === updated.id ? updated : r)));
  }
}

import { computed, signal } from '@angular/core';
import { Organization, OrganizationStatus } from '../models/organization.model';
import { ContentLanguage } from '../../guide/models/content-language.model';
import { OrganizationCreateInput, OrganizationSharedFields } from '../services/organization.service';

let nextId = 0;

export function makeOrganization(overrides: Partial<Organization> = {}): Organization {
  return {
    id: `id-${++nextId}`,
    slug: 'org',
    type: 'ngo',
    status: 'draft',
    order: 0,
    logoUrl: 'https://example.com/logo.png',
    scopeType: 'global',
    contactLinks: {},
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    translations: { en: { name: 'Org', description: '' } },
    ...overrides,
  };
}

/** Component-level test double for OrganizationService — see FakeSectionService for rationale. */
export class FakeOrganizationService {
  private readonly _orgs = signal<Organization[]>([]);

  readonly organizations = computed(() => [...this._orgs()].sort((a, b) => a.order - b.order));

  seed(orgs: Organization[]): void {
    this._orgs.set(orgs);
  }

  create = vi.fn(async (input: OrganizationCreateInput): Promise<Organization> => {
    const org = makeOrganization({
      slug: input.slug,
      type: input.type,
      order: this._orgs().length,
      translations: { [input.language]: input.translation },
      ...input.sharedFields,
    });
    this._orgs.update((orgs) => [...orgs, org]);
    return org;
  });

  saveTranslation = vi.fn(
    async (
      id: string,
      language: ContentLanguage,
      translation: Organization['translations'][ContentLanguage],
      newSlug?: string,
    ): Promise<Organization> => {
      const current = this._orgs().find((o) => o.id === id);
      if (!current) {
        throw new Error(`Unknown organization id: ${id}`);
      }
      const updated: Organization = {
        ...current,
        slug: newSlug ?? current.slug,
        translations: { ...current.translations, [language]: translation },
        updatedAt: new Date().toISOString(),
      };
      this.replace(updated);
      return updated;
    },
  );

  removeTranslation = vi.fn(async (id: string, language: ContentLanguage): Promise<Organization> => {
    const current = this._orgs().find((o) => o.id === id);
    if (!current) {
      throw new Error(`Unknown organization id: ${id}`);
    }
    const translations = { ...current.translations };
    delete translations[language];
    const updated: Organization = { ...current, translations, updatedAt: new Date().toISOString() };
    this.replace(updated);
    return updated;
  });

  updateSharedFields = vi.fn(
    async (id: string, sharedFields: OrganizationSharedFields): Promise<Organization> => {
      const current = this._orgs().find((o) => o.id === id);
      if (!current) {
        throw new Error(`Unknown organization id: ${id}`);
      }
      const updated: Organization = { ...current, ...sharedFields, updatedAt: new Date().toISOString() };
      this.replace(updated);
      return updated;
    },
  );

  delete = vi.fn(async (id: string): Promise<void> => {
    this._orgs.update((orgs) => orgs.filter((o) => o.id !== id));
  });

  publish = vi.fn((id: string): Promise<Organization> => this.setStatus(id, 'published'));
  pause = vi.fn((id: string): Promise<Organization> => this.setStatus(id, 'paused'));

  reorder = vi.fn(async (orderedIds: string[]): Promise<void> => {
    const orderById = new Map(orderedIds.map((id, index) => [id, index]));
    this._orgs.update((orgs) => orgs.map((org) => ({ ...org, order: orderById.get(org.id) ?? org.order })));
  });

  private async setStatus(id: string, status: OrganizationStatus): Promise<Organization> {
    const current = this._orgs().find((o) => o.id === id);
    if (!current) {
      throw new Error(`Unknown organization id: ${id}`);
    }
    const updated: Organization = { ...current, status, updatedAt: new Date().toISOString() };
    this.replace(updated);
    return updated;
  }

  private replace(updated: Organization): void {
    this._orgs.update((orgs) => orgs.map((o) => (o.id === updated.id ? updated : o)));
  }
}

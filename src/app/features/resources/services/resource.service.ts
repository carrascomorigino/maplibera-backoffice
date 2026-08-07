import { Injectable, computed, signal } from '@angular/core';
import {
  AppTranslation,
  MultimediaTranslation,
  MultimediaType,
  NutritionTranslation,
  RecipeTranslation,
  RESOURCE_CATEGORIES,
  Resource,
  ResourceCategory,
  ResourceTranslation,
} from '../models/resource.model';
import { ContentLanguage } from '../../guide/models/content-language.model';

const STORAGE_KEY = 'resources';

function translationsEqual(a: ResourceTranslation, b: ResourceTranslation): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export type ResourceCreateInput =
  | {
      category: 'nutrition';
      slug: string;
      sharedFields: { sourceLinks: string[]; pdfUrls: string[] };
      language: ContentLanguage;
      translation: NutritionTranslation;
    }
  | {
      category: 'recipes';
      slug: string;
      sharedFields: { preparationMinutes: number; photoUrls: string[] };
      language: ContentLanguage;
      translation: RecipeTranslation;
    }
  | {
      category: 'multimedia';
      slug: string;
      sharedFields: { mediaType: MultimediaType; externalUrl: string; posterUrl: string };
      language: ContentLanguage;
      translation: MultimediaTranslation;
    }
  | {
      category: 'apps';
      slug: string;
      sharedFields: { appStoreUrl?: string; playStoreUrl?: string; iconUrl: string };
      language: ContentLanguage;
      translation: AppTranslation;
    };

@Injectable({ providedIn: 'root' })
export class ResourceService {
  private readonly state = signal<Resource[]>(this.loadFromStorage());

  private readonly categoryOrder = new Map(RESOURCE_CATEGORIES.map((category, index) => [category, index]));

  readonly resources = computed(() =>
    [...this.state()].sort((a, b) => {
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

  create(input: ResourceCreateInput): Resource {
    const now = new Date().toISOString();
    const order = this.state().filter((r) => r.category === input.category).length;
    const resource = this.buildResource(input, order, now);

    this.state.update((resources) => [...resources, resource]);
    this.persist();
    return resource;
  }

  saveTranslation(
    slug: string,
    language: ContentLanguage,
    translation: ResourceTranslation,
    newSlug?: string,
  ): void {
    this.state.update((resources) =>
      resources.map((resource) => {
        if (resource.slug !== slug) {
          return resource;
        }

        const previousTranslation = resource.translations[language];
        const contentChanged =
          !previousTranslation || !translationsEqual(previousTranslation, translation);
        const translations = { ...resource.translations, [language]: translation };
        const staleLanguages = { ...resource.staleLanguages };
        delete staleLanguages[language];
        if (previousTranslation && contentChanged) {
          for (const lang of Object.keys(translations) as ContentLanguage[]) {
            if (lang !== language) {
              staleLanguages[lang] = language;
            }
          }
        }

        return {
          ...resource,
          slug: newSlug ?? resource.slug,
          translations,
          staleLanguages,
          updatedAt: new Date().toISOString(),
        } as Resource;
      }),
    );
    this.persist();
  }

  removeTranslation(slug: string, language: ContentLanguage): void {
    this.state.update((resources) =>
      resources.map((resource) => {
        if (resource.slug !== slug || Object.keys(resource.translations).length <= 1) {
          return resource;
        }

        const translations = { ...resource.translations };
        delete translations[language];

        const staleLanguages = { ...resource.staleLanguages };
        delete staleLanguages[language];
        for (const lang of Object.keys(staleLanguages) as ContentLanguage[]) {
          if (staleLanguages[lang] === language) {
            delete staleLanguages[lang];
          }
        }

        return {
          ...resource,
          translations,
          staleLanguages,
          updatedAt: new Date().toISOString(),
        } as Resource;
      }),
    );
    this.persist();
  }

  updateSharedFields(slug: string, sharedFields: Record<string, unknown>): void {
    this.state.update((resources) =>
      resources.map((resource) =>
        resource.slug === slug
          ? ({ ...resource, ...sharedFields, updatedAt: new Date().toISOString() } as Resource)
          : resource,
      ),
    );
    this.persist();
  }

  reorder(category: ResourceCategory, orderedSlugs: string[]): void {
    const orderBySlug = new Map(orderedSlugs.map((slug, index) => [slug, index]));
    this.state.update((resources) =>
      resources.map((resource) =>
        resource.category === category
          ? { ...resource, order: orderBySlug.get(resource.slug) ?? resource.order }
          : resource,
      ),
    );
    this.persist();
  }

  publish(slug: string): void {
    this.setStatus(slug, 'published');
  }

  pause(slug: string): void {
    this.setStatus(slug, 'paused');
  }

  private setStatus(slug: string, status: Resource['status']): void {
    this.state.update((resources) =>
      resources.map((resource) =>
        resource.slug === slug
          ? { ...resource, status, updatedAt: new Date().toISOString() }
          : resource,
      ),
    );
    this.persist();
  }

  private buildResource(input: ResourceCreateInput, order: number, now: string): Resource {
    const base = { slug: input.slug, status: 'draft' as const, order, createdAt: now, updatedAt: now };
    switch (input.category) {
      case 'nutrition':
        return {
          ...base,
          category: 'nutrition',
          ...input.sharedFields,
          translations: { [input.language]: input.translation },
        };
      case 'recipes':
        return {
          ...base,
          category: 'recipes',
          ...input.sharedFields,
          translations: { [input.language]: input.translation },
        };
      case 'multimedia':
        return {
          ...base,
          category: 'multimedia',
          ...input.sharedFields,
          translations: { [input.language]: input.translation },
        };
      case 'apps':
        return {
          ...base,
          category: 'apps',
          ...input.sharedFields,
          translations: { [input.language]: input.translation },
        };
    }
  }

  private persist(): void {
    if (typeof localStorage === 'undefined') {
      return;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state()));
  }

  private loadFromStorage(): Resource[] {
    if (typeof localStorage === 'undefined') {
      return [];
    }
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    try {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        return [];
      }
      return parsed.filter(
        (resource): resource is Resource =>
          typeof resource?.slug === 'string' &&
          resource.slug.length > 0 &&
          RESOURCE_CATEGORIES.includes(resource.category) &&
          typeof resource?.translations === 'object' &&
          resource.translations !== null &&
          Object.keys(resource.translations).length > 0,
      );
    } catch {
      return [];
    }
  }
}

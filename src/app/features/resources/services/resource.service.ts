import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import {
  AppTranslation,
  MultimediaTranslation,
  MultimediaType,
  NutritionTranslation,
  RecipeTranslation,
  RESOURCE_CATEGORIES,
  Resource,
  ResourceCategory,
  ResourceStatus,
  ResourceTranslation,
} from '../models/resource.model';
import { ContentLanguage } from '../../guide/models/content-language.model';

const BASE_URL = '/backend/resources';

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
  private readonly http = inject(HttpClient);

  private readonly state = signal<Resource[]>([]);

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

  constructor() {
    void this.refresh();
  }

  async refresh(): Promise<void> {
    const resources = await firstValueFrom(this.http.get<Resource[]>(BASE_URL));
    this.state.set(resources);
  }

  async create(input: ResourceCreateInput): Promise<Resource> {
    const resource = await firstValueFrom(this.http.post<Resource>(BASE_URL, input));
    this.state.update((resources) => [...resources, resource]);
    return resource;
  }

  async saveTranslation(
    id: string,
    language: ContentLanguage,
    translation: ResourceTranslation,
    newSlug?: string,
  ): Promise<Resource> {
    const updated = await firstValueFrom(
      this.http.put<Resource>(`${BASE_URL}/${id}/translations`, { language, translation, newSlug }),
    );
    this.replace(updated);
    return updated;
  }

  async removeTranslation(id: string, language: ContentLanguage): Promise<Resource> {
    const updated = await firstValueFrom(
      this.http.delete<Resource>(`${BASE_URL}/${id}/translations/${language}`),
    );
    this.replace(updated);
    return updated;
  }

  async updateSharedFields(id: string, sharedFields: Record<string, unknown>): Promise<Resource> {
    const updated = await firstValueFrom(
      this.http.patch<Resource>(`${BASE_URL}/${id}/shared-fields`, { sharedFields }),
    );
    this.replace(updated);
    return updated;
  }

  async reorder(category: ResourceCategory, orderedIds: string[]): Promise<void> {
    await firstValueFrom(this.http.post(`${BASE_URL}/reorder`, { category, orderedIds }));
    const orderById = new Map(orderedIds.map((id, index) => [id, index]));
    this.state.update((resources) =>
      resources.map((resource) =>
        resource.category === category
          ? { ...resource, order: orderById.get(resource.id) ?? resource.order }
          : resource,
      ),
    );
  }

  async publish(id: string): Promise<Resource> {
    return this.setStatus(id, 'published');
  }

  async pause(id: string): Promise<Resource> {
    return this.setStatus(id, 'paused');
  }

  private async setStatus(id: string, status: ResourceStatus): Promise<Resource> {
    const action = status === 'published' ? 'publish' : 'pause';
    const updated = await firstValueFrom(this.http.post<Resource>(`${BASE_URL}/${id}/${action}`, {}));
    this.replace(updated);
    return updated;
  }

  private replace(updated: Resource): void {
    this.state.update((resources) =>
      resources.map((resource) => (resource.id === updated.id ? updated : resource)),
    );
  }
}

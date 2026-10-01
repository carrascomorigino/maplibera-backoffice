import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { API_BASE_URL } from '../../../core/http/api-base-url.token';
import { firstValueFrom } from 'rxjs';
import { NewsCategory, NewsItem, NewsStatus, NewsTranslation } from '../models/news-item.model';
import { ContentLanguage } from '../../guide/models/content-language.model';

export interface NewsItemSharedFields {
  images?: { url?: string; data?: string; description?: string }[];
  videoUrl?: string;
  publishedAt: string;
  eventDate?: string;
  sourceLinks: string[];
}

export interface NewsItemCreateInput {
  category: NewsCategory;
  slug: string;
  sharedFields: NewsItemSharedFields;
  language: ContentLanguage;
  translation: NewsTranslation;
}

@Injectable({ providedIn: 'root' })
export class NewsItemService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${inject(API_BASE_URL)}/news`;

  private readonly state = signal<NewsItem[]>([]);

  readonly items = computed(() =>
    [...this.state()].sort((a, b) => {
      const dateDiff = b.publishedAt.localeCompare(a.publishedAt);
      return dateDiff !== 0 ? dateDiff : b.createdAt.localeCompare(a.createdAt);
    }),
  );

  constructor() {
    void this.refresh();
  }

  async refresh(): Promise<void> {
    const items = await firstValueFrom(this.http.get<NewsItem[]>(this.baseUrl));
    this.state.set(items);
  }

  async create(input: NewsItemCreateInput): Promise<NewsItem> {
    const item = await firstValueFrom(this.http.post<NewsItem>(this.baseUrl, input));
    this.state.update((items) => [...items, item]);
    return item;
  }

  async saveTranslation(
    id: string,
    language: ContentLanguage,
    translation: NewsTranslation,
    newSlug?: string,
  ): Promise<NewsItem> {
    const updated = await firstValueFrom(
      this.http.put<NewsItem>(`${this.baseUrl}/${id}/translations`, { language, translation, newSlug }),
    );
    this.replace(updated);
    return updated;
  }

  async removeTranslation(id: string, language: ContentLanguage): Promise<NewsItem> {
    const updated = await firstValueFrom(
      this.http.delete<NewsItem>(`${this.baseUrl}/${id}/translations/${language}`),
    );
    this.replace(updated);
    return updated;
  }

  async updateSharedFields(id: string, sharedFields: NewsItemSharedFields): Promise<NewsItem> {
    const updated = await firstValueFrom(
      this.http.patch<NewsItem>(`${this.baseUrl}/${id}/shared-fields`, { sharedFields }),
    );
    this.replace(updated);
    return updated;
  }

  async delete(id: string): Promise<void> {
    await firstValueFrom(this.http.delete<void>(`${this.baseUrl}/${id}`));
    this.state.update((items) => items.filter((item) => item.id !== id));
  }

  async publish(id: string): Promise<NewsItem> {
    return this.setStatus(id, 'published');
  }

  async pause(id: string): Promise<NewsItem> {
    return this.setStatus(id, 'paused');
  }

  private async setStatus(id: string, status: NewsStatus): Promise<NewsItem> {
    const action = status === 'published' ? 'publish' : 'pause';
    const updated = await firstValueFrom(this.http.post<NewsItem>(`${this.baseUrl}/${id}/${action}`, {}));
    this.replace(updated);
    return updated;
  }

  private replace(updated: NewsItem): void {
    this.state.update((items) => items.map((item) => (item.id === updated.id ? updated : item)));
  }
}

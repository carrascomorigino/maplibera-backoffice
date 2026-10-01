import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { API_BASE_URL } from '../../../core/http/api-base-url.token';
import { firstValueFrom } from 'rxjs';
import { Section, SectionStatus, SectionTranslation } from '../models/section.model';
import { ContentLanguage } from '../models/content-language.model';

export interface SectionTranslationInput {
  slug: string;
  images?: { url?: string; data?: string; description?: string }[];
  videoUrl?: string;
  language: ContentLanguage;
  translation: SectionTranslation;
  availableCountries?: string[];
}

@Injectable({ providedIn: 'root' })
export class SectionService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${inject(API_BASE_URL)}/sections`;

  private readonly state = signal<Section[]>([]);

  readonly sections = computed(() => [...this.state()].sort((a, b) => a.order - b.order));

  constructor() {
    void this.refresh();
  }

  async refresh(): Promise<void> {
    const sections = await firstValueFrom(this.http.get<Section[]>(this.baseUrl));
    this.state.set(sections);
  }

  async create(input: SectionTranslationInput): Promise<Section> {
    const section = await firstValueFrom(this.http.post<Section>(this.baseUrl, input));
    this.state.update((sections) => [...sections, section]);
    return section;
  }

  async saveTranslation(id: string, input: SectionTranslationInput): Promise<Section> {
    const updated = await firstValueFrom(this.http.put<Section>(`${this.baseUrl}/${id}`, input));
    this.replace(updated);
    return updated;
  }

  async removeTranslation(id: string, language: ContentLanguage): Promise<Section> {
    const updated = await firstValueFrom(
      this.http.delete<Section>(`${this.baseUrl}/${id}/translations/${language}`),
    );
    this.replace(updated);
    return updated;
  }

  async publish(id: string): Promise<Section> {
    return this.setStatus(id, 'published');
  }

  async pause(id: string): Promise<Section> {
    return this.setStatus(id, 'paused');
  }

  async delete(id: string): Promise<void> {
    await firstValueFrom(this.http.delete<void>(`${this.baseUrl}/${id}`));
    this.state.update((sections) => sections.filter((section) => section.id !== id));
  }

  async reorder(orderedIds: string[]): Promise<void> {
    await firstValueFrom(this.http.post(`${this.baseUrl}/reorder`, { orderedIds }));
    const orderById = new Map(orderedIds.map((id, index) => [id, index]));
    this.state.update((sections) =>
      sections.map((section) => ({ ...section, order: orderById.get(section.id) ?? section.order })),
    );
  }

  private async setStatus(id: string, status: SectionStatus): Promise<Section> {
    const action = status === 'published' ? 'publish' : 'pause';
    const updated = await firstValueFrom(this.http.post<Section>(`${this.baseUrl}/${id}/${action}`, {}));
    this.replace(updated);
    return updated;
  }

  private replace(updated: Section): void {
    this.state.update((sections) => sections.map((section) => (section.id === updated.id ? updated : section)));
  }
}

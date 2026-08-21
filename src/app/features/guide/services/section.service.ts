import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { Section, SectionStatus, SectionTranslation } from '../models/section.model';
import { ContentLanguage } from '../models/content-language.model';

const BASE_URL = '/backend/sections';

export interface SectionTranslationInput {
  slug: string;
  imageUrl?: string;
  imageData?: string;
  language: ContentLanguage;
  translation: SectionTranslation;
  availableCountries?: string[];
}

@Injectable({ providedIn: 'root' })
export class SectionService {
  private readonly http = inject(HttpClient);

  private readonly state = signal<Section[]>([]);

  readonly sections = computed(() => [...this.state()].sort((a, b) => a.order - b.order));

  constructor() {
    void this.refresh();
  }

  async refresh(): Promise<void> {
    const sections = await firstValueFrom(this.http.get<Section[]>(BASE_URL));
    this.state.set(sections);
  }

  async create(input: SectionTranslationInput): Promise<Section> {
    const section = await firstValueFrom(this.http.post<Section>(BASE_URL, input));
    this.state.update((sections) => [...sections, section]);
    return section;
  }

  async saveTranslation(id: string, input: SectionTranslationInput): Promise<Section> {
    const updated = await firstValueFrom(this.http.put<Section>(`${BASE_URL}/${id}`, input));
    this.replace(updated);
    return updated;
  }

  async removeTranslation(id: string, language: ContentLanguage): Promise<Section> {
    const updated = await firstValueFrom(
      this.http.delete<Section>(`${BASE_URL}/${id}/translations/${language}`),
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
    await firstValueFrom(this.http.delete<void>(`${BASE_URL}/${id}`));
    this.state.update((sections) => sections.filter((section) => section.id !== id));
  }

  async reorder(orderedIds: string[]): Promise<void> {
    await firstValueFrom(this.http.post(`${BASE_URL}/reorder`, { orderedIds }));
    const orderById = new Map(orderedIds.map((id, index) => [id, index]));
    this.state.update((sections) =>
      sections.map((section) => ({ ...section, order: orderById.get(section.id) ?? section.order })),
    );
  }

  private async setStatus(id: string, status: SectionStatus): Promise<Section> {
    const action = status === 'published' ? 'publish' : 'pause';
    const updated = await firstValueFrom(this.http.post<Section>(`${BASE_URL}/${id}/${action}`, {}));
    this.replace(updated);
    return updated;
  }

  private replace(updated: Section): void {
    this.state.update((sections) => sections.map((section) => (section.id === updated.id ? updated : section)));
  }
}

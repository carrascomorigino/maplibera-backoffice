import { computed, signal } from '@angular/core';
import { Section, SectionStatus } from '../models/section.model';
import { ContentLanguage } from '../models/content-language.model';
import { SectionTranslationInput } from '../services/section.service';

let nextId = 0;

export function makeSection(overrides: Partial<Section> = {}): Section {
  return {
    id: `id-${++nextId}`,
    slug: 'section',
    imageUrl: '',
    status: 'draft',
    order: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    translations: { en: { title: 'Section', description: '' } },
    ...overrides,
  };
}

/**
 * Component-level test double for SectionService. Mirrors just enough of the real HTTP-backed
 * service (local list + id/order bookkeeping) for UI wiring tests — it deliberately does NOT
 * reimplement staleLanguages diffing or slug-uniqueness enforcement, since that logic now lives
 * server-side and is covered by the backend's own tests, not here.
 */
export class FakeSectionService {
  private readonly _sections = signal<Section[]>([]);

  readonly sections = computed(() => [...this._sections()].sort((a, b) => a.order - b.order));

  seed(sections: Section[]): void {
    this._sections.set(sections);
  }

  create = vi.fn(async (input: SectionTranslationInput): Promise<Section> => {
    const section = makeSection({
      slug: input.slug,
      imageUrl: input.imageUrl,
      order: this._sections().length,
      translations: { [input.language]: input.translation },
      availableCountries: input.availableCountries,
    });
    this._sections.update((sections) => [...sections, section]);
    return section;
  });

  saveTranslation = vi.fn(async (id: string, input: SectionTranslationInput): Promise<Section> => {
    const current = this._sections().find((s) => s.id === id);
    if (!current) {
      throw new Error(`Unknown section id: ${id}`);
    }
    const updated: Section = {
      ...current,
      slug: input.slug,
      imageUrl: input.imageUrl,
      translations: { ...current.translations, [input.language]: input.translation },
      availableCountries: input.availableCountries,
      updatedAt: new Date().toISOString(),
    };
    this.replace(updated);
    return updated;
  });

  removeTranslation = vi.fn(async (id: string, language: ContentLanguage): Promise<Section> => {
    const current = this._sections().find((s) => s.id === id);
    if (!current) {
      throw new Error(`Unknown section id: ${id}`);
    }
    const translations = { ...current.translations };
    delete translations[language];
    const updated: Section = { ...current, translations, updatedAt: new Date().toISOString() };
    this.replace(updated);
    return updated;
  });

  publish = vi.fn((id: string): Promise<Section> => this.setStatus(id, 'published'));
  pause = vi.fn((id: string): Promise<Section> => this.setStatus(id, 'paused'));

  reorder = vi.fn(async (orderedIds: string[]): Promise<void> => {
    const orderById = new Map(orderedIds.map((id, index) => [id, index]));
    this._sections.update((sections) =>
      sections.map((section) => ({ ...section, order: orderById.get(section.id) ?? section.order })),
    );
  });

  private async setStatus(id: string, status: SectionStatus): Promise<Section> {
    const current = this._sections().find((s) => s.id === id);
    if (!current) {
      throw new Error(`Unknown section id: ${id}`);
    }
    const updated: Section = { ...current, status, updatedAt: new Date().toISOString() };
    this.replace(updated);
    return updated;
  }

  private replace(updated: Section): void {
    this._sections.update((sections) => sections.map((s) => (s.id === updated.id ? updated : s)));
  }
}

import { Injectable, computed, signal } from '@angular/core';
import { Section, SectionTranslation } from '../models/section.model';
import { ContentLanguage } from '../models/content-language.model';

const STORAGE_KEY = 'guide-sections';

function translationsEqual(a: SectionTranslation, b: SectionTranslation): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export interface SectionTranslationInput {
  slug: string;
  imageUrl: string;
  language: ContentLanguage;
  translation: SectionTranslation;
  availableCountries?: string[];
}

@Injectable({ providedIn: 'root' })
export class SectionService {
  private readonly state = signal<Section[]>(this.loadFromStorage());

  readonly sections = computed(() =>
    [...this.state()].sort((a, b) => a.order - b.order),
  );

  create(input: SectionTranslationInput): Section {
    const now = new Date().toISOString();
    const section: Section = {
      slug: input.slug,
      imageUrl: input.imageUrl,
      translations: { [input.language]: input.translation },
      status: 'draft',
      order: this.state().length,
      createdAt: now,
      updatedAt: now,
      availableCountries: input.availableCountries,
    };

    this.state.update((sections) => [...sections, section]);
    this.persist();
    return section;
  }

  saveTranslation(currentSlug: string, input: SectionTranslationInput): void {
    this.state.update((sections) =>
      sections.map((section) => {
        if (section.slug !== currentSlug) {
          return section;
        }

        const previousTranslation = section.translations[input.language];
        const contentChanged =
          !previousTranslation || !translationsEqual(previousTranslation, input.translation);
        const translations = { ...section.translations, [input.language]: input.translation };
        const staleLanguages = { ...section.staleLanguages };
        delete staleLanguages[input.language];
        if (previousTranslation && contentChanged) {
          for (const lang of Object.keys(translations) as ContentLanguage[]) {
            if (lang !== input.language) {
              staleLanguages[lang] = input.language;
            }
          }
        }

        return {
          ...section,
          slug: input.slug,
          imageUrl: input.imageUrl,
          translations,
          staleLanguages,
          availableCountries: input.availableCountries,
          updatedAt: new Date().toISOString(),
        };
      }),
    );
    this.persist();
  }

  removeTranslation(slug: string, language: ContentLanguage): void {
    this.state.update((sections) =>
      sections.map((section) => {
        if (section.slug !== slug || Object.keys(section.translations).length <= 1) {
          return section;
        }

        const translations = { ...section.translations };
        delete translations[language];

        const staleLanguages = { ...section.staleLanguages };
        delete staleLanguages[language];
        for (const lang of Object.keys(staleLanguages) as ContentLanguage[]) {
          if (staleLanguages[lang] === language) {
            delete staleLanguages[lang];
          }
        }

        return { ...section, translations, staleLanguages, updatedAt: new Date().toISOString() };
      }),
    );
    this.persist();
  }

  publish(slug: string): void {
    this.setStatus(slug, 'published');
  }

  pause(slug: string): void {
    this.setStatus(slug, 'paused');
  }

  reorder(orderedSlugs: string[]): void {
    const orderBySlug = new Map(orderedSlugs.map((slug, index) => [slug, index]));
    this.state.update((sections) =>
      sections.map((section) => ({
        ...section,
        order: orderBySlug.get(section.slug) ?? section.order,
      })),
    );
    this.persist();
  }

  private setStatus(slug: string, status: Section['status']): void {
    this.state.update((sections) =>
      sections.map((section) =>
        section.slug === slug
          ? { ...section, status, updatedAt: new Date().toISOString() }
          : section,
      ),
    );
    this.persist();
  }

  private persist(): void {
    if (typeof localStorage === 'undefined') {
      return;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state()));
  }

  private loadFromStorage(): Section[] {
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
        (section): section is Section =>
          typeof section?.slug === 'string' &&
          section.slug.length > 0 &&
          typeof section?.translations === 'object' &&
          section.translations !== null &&
          Object.keys(section.translations).length > 0,
      );
    } catch {
      return [];
    }
  }
}

import { Injectable, computed, signal } from '@angular/core';
import { NewsCategory, NewsItem, NewsTranslation } from '../models/news-item.model';
import { ContentLanguage } from '../../guide/models/content-language.model';

const STORAGE_KEY = 'app-news-items';

function translationsEqual(a: NewsTranslation, b: NewsTranslation): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export interface NewsItemSharedFields {
  imageUrl: string;
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
  private readonly state = signal<NewsItem[]>(this.loadFromStorage());

  readonly items = computed(() =>
    [...this.state()].sort((a, b) => {
      const dateDiff = b.publishedAt.localeCompare(a.publishedAt);
      return dateDiff !== 0 ? dateDiff : b.createdAt.localeCompare(a.createdAt);
    }),
  );

  create(input: NewsItemCreateInput): NewsItem {
    const now = new Date().toISOString();
    const item: NewsItem = {
      slug: input.slug,
      category: input.category,
      status: 'draft',
      imageUrl: input.sharedFields.imageUrl,
      publishedAt: input.sharedFields.publishedAt,
      eventDate: input.sharedFields.eventDate,
      sourceLinks: input.sharedFields.sourceLinks,
      createdAt: now,
      updatedAt: now,
      translations: { [input.language]: input.translation },
    };

    this.state.update((items) => [...items, item]);
    this.persist();
    return item;
  }

  saveTranslation(
    slug: string,
    language: ContentLanguage,
    translation: NewsTranslation,
    newSlug?: string,
  ): void {
    this.state.update((items) =>
      items.map((item) => {
        if (item.slug !== slug) {
          return item;
        }

        const previousTranslation = item.translations[language];
        const contentChanged = !previousTranslation || !translationsEqual(previousTranslation, translation);
        const translations = { ...item.translations, [language]: translation };
        const staleLanguages = { ...item.staleLanguages };
        delete staleLanguages[language];
        if (previousTranslation && contentChanged) {
          for (const lang of Object.keys(translations) as ContentLanguage[]) {
            if (lang !== language) {
              staleLanguages[lang] = language;
            }
          }
        }

        return {
          ...item,
          slug: newSlug ?? item.slug,
          translations,
          staleLanguages,
          updatedAt: new Date().toISOString(),
        };
      }),
    );
    this.persist();
  }

  removeTranslation(slug: string, language: ContentLanguage): void {
    this.state.update((items) =>
      items.map((item) => {
        if (item.slug !== slug || Object.keys(item.translations).length <= 1) {
          return item;
        }

        const translations = { ...item.translations };
        delete translations[language];

        const staleLanguages = { ...item.staleLanguages };
        delete staleLanguages[language];
        for (const lang of Object.keys(staleLanguages) as ContentLanguage[]) {
          if (staleLanguages[lang] === language) {
            delete staleLanguages[lang];
          }
        }

        return {
          ...item,
          translations,
          staleLanguages,
          updatedAt: new Date().toISOString(),
        };
      }),
    );
    this.persist();
  }

  updateSharedFields(slug: string, sharedFields: NewsItemSharedFields): void {
    this.state.update((items) =>
      items.map((item) =>
        item.slug === slug
          ? {
              ...item,
              imageUrl: sharedFields.imageUrl,
              publishedAt: sharedFields.publishedAt,
              eventDate: sharedFields.eventDate,
              sourceLinks: sharedFields.sourceLinks,
              updatedAt: new Date().toISOString(),
            }
          : item,
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

  private setStatus(slug: string, status: NewsItem['status']): void {
    this.state.update((items) =>
      items.map((item) =>
        item.slug === slug ? { ...item, status, updatedAt: new Date().toISOString() } : item,
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

  private loadFromStorage(): NewsItem[] {
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
        (item): item is NewsItem =>
          typeof item?.slug === 'string' &&
          item.slug.length > 0 &&
          (item.category === 'news' || item.category === 'event') &&
          typeof item?.translations === 'object' &&
          item.translations !== null &&
          Object.keys(item.translations).length > 0,
      );
    } catch {
      return [];
    }
  }
}

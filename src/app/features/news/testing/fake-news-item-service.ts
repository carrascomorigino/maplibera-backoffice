import { computed, signal } from '@angular/core';
import { NewsItem, NewsStatus } from '../models/news-item.model';
import { ContentLanguage } from '../../guide/models/content-language.model';
import { NewsItemCreateInput, NewsItemSharedFields } from '../services/news-item.service';

let nextId = 0;

export function makeNewsItem(overrides: Partial<NewsItem> = {}): NewsItem {
  return {
    id: `id-${++nextId}`,
    slug: 'news-item',
    category: 'news',
    status: 'draft',
    images: [{ url: 'https://example.com/n.jpg' }],
    publishedAt: '2026-01-01',
    sourceLinks: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    translations: { en: { title: 'News item', subtitle: '', description: '' } },
    ...overrides,
  };
}

/** Component-level test double for NewsItemService — see FakeSectionService for rationale. */
export class FakeNewsItemService {
  private readonly _items = signal<NewsItem[]>([]);

  readonly items = computed(() =>
    [...this._items()].sort((a, b) => {
      const dateDiff = b.publishedAt.localeCompare(a.publishedAt);
      return dateDiff !== 0 ? dateDiff : b.createdAt.localeCompare(a.createdAt);
    }),
  );

  seed(items: NewsItem[]): void {
    this._items.set(items);
  }

  create = vi.fn(async (input: NewsItemCreateInput): Promise<NewsItem> => {
    const { images, videoUrl, publishedAt, eventDate, sourceLinks } = input.sharedFields;
    const item = makeNewsItem({
      slug: input.slug,
      category: input.category,
      translations: { [input.language]: input.translation },
      images: (images ?? []).map((image) => ({
        url: image.url ?? image.data ?? '',
        description: image.description,
      })),
      videoUrl,
      publishedAt,
      eventDate,
      sourceLinks,
    });
    this._items.update((items) => [...items, item]);
    return item;
  });

  saveTranslation = vi.fn(
    async (
      id: string,
      language: ContentLanguage,
      translation: NewsItem['translations'][ContentLanguage],
      newSlug?: string,
    ): Promise<NewsItem> => {
      const current = this._items().find((i) => i.id === id);
      if (!current) {
        throw new Error(`Unknown news item id: ${id}`);
      }
      const updated: NewsItem = {
        ...current,
        slug: newSlug ?? current.slug,
        translations: { ...current.translations, [language]: translation },
        updatedAt: new Date().toISOString(),
      };
      this.replace(updated);
      return updated;
    },
  );

  removeTranslation = vi.fn(async (id: string, language: ContentLanguage): Promise<NewsItem> => {
    const current = this._items().find((i) => i.id === id);
    if (!current) {
      throw new Error(`Unknown news item id: ${id}`);
    }
    const translations = { ...current.translations };
    delete translations[language];
    const updated: NewsItem = { ...current, translations, updatedAt: new Date().toISOString() };
    this.replace(updated);
    return updated;
  });

  updateSharedFields = vi.fn(async (id: string, sharedFields: NewsItemSharedFields): Promise<NewsItem> => {
    const current = this._items().find((i) => i.id === id);
    if (!current) {
      throw new Error(`Unknown news item id: ${id}`);
    }
    const { images, videoUrl, publishedAt, eventDate, sourceLinks } = sharedFields;
    const updated: NewsItem = {
      ...current,
      images: (images ?? []).map((image) => ({
        url: image.url ?? image.data ?? '',
        description: image.description,
      })),
      videoUrl,
      publishedAt,
      eventDate,
      sourceLinks,
      updatedAt: new Date().toISOString(),
    };
    this.replace(updated);
    return updated;
  });

  delete = vi.fn(async (id: string): Promise<void> => {
    this._items.update((items) => items.filter((i) => i.id !== id));
  });

  publish = vi.fn((id: string): Promise<NewsItem> => this.setStatus(id, 'published'));
  pause = vi.fn((id: string): Promise<NewsItem> => this.setStatus(id, 'paused'));

  private async setStatus(id: string, status: NewsStatus): Promise<NewsItem> {
    const current = this._items().find((i) => i.id === id);
    if (!current) {
      throw new Error(`Unknown news item id: ${id}`);
    }
    const updated: NewsItem = { ...current, status, updatedAt: new Date().toISOString() };
    this.replace(updated);
    return updated;
  }

  private replace(updated: NewsItem): void {
    this._items.update((items) => items.map((i) => (i.id === updated.id ? updated : i)));
  }
}

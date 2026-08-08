import { NewsItemService } from './news-item.service';

const STORAGE_KEY = 'app-news-items';

function setup(): NewsItemService {
  return new NewsItemService();
}

function newsInput(overrides: { slug?: string; publishedAt?: string } = {}) {
  return {
    category: 'news' as const,
    slug: overrides.slug ?? 'new-visitor-center',
    sharedFields: {
      imageUrl: 'https://example.com/banner.jpg',
      publishedAt: overrides.publishedAt ?? '2026-08-01',
      sourceLinks: [] as string[],
    },
    language: 'en' as const,
    translation: { title: 'New visitor center', subtitle: 'Now open', description: 'Details' },
  };
}

function eventInput(overrides: { slug?: string; publishedAt?: string; eventDate?: string } = {}) {
  return {
    category: 'event' as const,
    slug: overrides.slug ?? 'summer-festival',
    sharedFields: {
      imageUrl: 'https://example.com/festival.jpg',
      publishedAt: overrides.publishedAt ?? '2026-07-01',
      eventDate: overrides.eventDate ?? '2026-08-15',
      sourceLinks: [] as string[],
    },
    language: 'en' as const,
    translation: { title: 'Summer festival', subtitle: 'Join us', description: 'Details' },
  };
}

describe('NewsItemService', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('create', () => {
    it('creates a news item with draft status and a single translation', () => {
      const service = setup();

      const item = service.create(newsInput());

      expect(item.category).toBe('news');
      expect(item.status).toBe('draft');
      expect(Object.keys(item.translations)).toEqual(['en']);
      expect(item.eventDate).toBeUndefined();
      expect(service.items()).toEqual([item]);
    });

    it('creates an event with an eventDate', () => {
      const service = setup();

      const item = service.create(eventInput());

      expect(item.category).toBe('event');
      expect(item.eventDate).toBe('2026-08-15');
    });
  });

  describe('items ordering', () => {
    it('sorts items by publishedAt descending regardless of category', () => {
      const service = setup();
      service.create(newsInput({ slug: 'oldest', publishedAt: '2026-01-01' }));
      service.create(eventInput({ slug: 'newest', publishedAt: '2026-08-01' }));
      service.create(newsInput({ slug: 'middle', publishedAt: '2026-04-01' }));

      expect(service.items().map((item) => item.slug)).toEqual(['newest', 'middle', 'oldest']);
    });
  });

  describe('saveTranslation / removeTranslation / staleLanguages', () => {
    it('adds a new language without dropping existing translations', () => {
      const service = setup();
      const created = service.create(newsInput());

      service.saveTranslation(created.slug, 'es', {
        title: 'Nuevo centro de visitantes',
        subtitle: 'Ya abrió',
        description: 'Detalles',
      });

      const updated = service.items()[0];
      expect(Object.keys(updated.translations).sort()).toEqual(['en', 'es']);
    });

    it('marks other languages stale when an existing translation is edited', () => {
      const service = setup();
      const created = service.create(newsInput());
      service.saveTranslation(created.slug, 'es', {
        title: 'Nuevo centro de visitantes',
        subtitle: 'Ya abrió',
        description: 'Detalles',
      });

      service.saveTranslation(created.slug, 'en', {
        title: 'New visitor center v2',
        subtitle: 'Now open',
        description: 'Details',
      });

      expect(service.items()[0].staleLanguages).toEqual({ es: 'en' });
    });

    it('removeTranslation deletes the language and clears related staleLanguages entries', () => {
      const service = setup();
      const created = service.create(newsInput());
      service.saveTranslation(created.slug, 'es', {
        title: 'Nuevo centro de visitantes',
        subtitle: 'Ya abrió',
        description: 'Detalles',
      });
      service.saveTranslation(created.slug, 'en', {
        title: 'New visitor center v2',
        subtitle: 'Now open',
        description: 'Details',
      });
      expect(service.items()[0].staleLanguages).toEqual({ es: 'en' });

      service.removeTranslation(created.slug, 'es');

      const item = service.items()[0];
      expect(Object.keys(item.translations)).toEqual(['en']);
      expect(item.staleLanguages).toEqual({});
    });

    it('renames the slug when a newSlug is passed', () => {
      const service = setup();
      const created = service.create(newsInput());

      service.saveTranslation(
        created.slug,
        'en',
        { title: 'New visitor center', subtitle: 'Now open', description: 'Details' },
        'visitor-center-grand-opening',
      );

      expect(service.items().find((i) => i.slug === created.slug)).toBeUndefined();
      expect(service.items().find((i) => i.slug === 'visitor-center-grand-opening')).toBeTruthy();
    });

    it('removeTranslation is a no-op when it would remove the last translation', () => {
      const service = setup();
      const created = service.create(newsInput());

      service.removeTranslation(created.slug, 'en');

      expect(Object.keys(service.items()[0].translations)).toEqual(['en']);
    });
  });

  describe('updateSharedFields', () => {
    it('updates shared fields without touching translations', () => {
      const service = setup();
      const created = service.create(newsInput());

      service.updateSharedFields(created.slug, {
        imageUrl: 'https://example.com/new-banner.jpg',
        publishedAt: '2026-09-01',
        sourceLinks: ['https://example.com/source'],
      });

      const updated = service.items()[0];
      expect(updated.imageUrl).toBe('https://example.com/new-banner.jpg');
      expect(updated.publishedAt).toBe('2026-09-01');
      expect(updated.sourceLinks).toEqual(['https://example.com/source']);
      expect(updated.translations.en?.title).toBe('New visitor center');
    });
  });

  describe('publish / pause', () => {
    it('publish sets status to published, pause sets it to paused', () => {
      const service = setup();
      const created = service.create(newsInput());

      service.publish(created.slug);
      expect(service.items()[0].status).toBe('published');

      service.pause(created.slug);
      expect(service.items()[0].status).toBe('paused');
    });
  });

  describe('persistence', () => {
    it('persists created items to localStorage under its own key', () => {
      const service = setup();
      service.create(newsInput());

      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
      expect(stored).toHaveLength(1);
    });

    it('loads existing items from localStorage on construction', () => {
      const first = setup();
      first.create(newsInput());

      const second = setup();
      expect(second.items()).toHaveLength(1);
    });

    it('falls back to an empty list when localStorage contains invalid JSON', () => {
      localStorage.setItem(STORAGE_KEY, '{not valid json');

      const service = setup();

      expect(service.items()).toEqual([]);
    });

    it('does not throw when localStorage is unavailable (e.g. during SSR)', () => {
      vi.stubGlobal('localStorage', undefined);

      let service!: NewsItemService;
      expect(() => (service = setup())).not.toThrow();
      expect(service.items()).toEqual([]);
      expect(() => service.create(newsInput())).not.toThrow();

      vi.unstubAllGlobals();
    });
  });
});

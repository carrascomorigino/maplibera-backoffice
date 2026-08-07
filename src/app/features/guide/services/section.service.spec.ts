import { SectionService, SectionTranslationInput } from './section.service';

const STORAGE_KEY = 'guide-sections';

function setup(): SectionService {
  return new SectionService();
}

function input(overrides: Partial<SectionTranslationInput> = {}): SectionTranslationInput {
  return {
    slug: 'getting-started',
    imageUrl: '',
    language: 'en',
    translation: { title: 'Getting started', description: 'Intro section' },
    ...overrides,
  };
}

describe('SectionService', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('create', () => {
    it('creates a section with draft status, appended order, timestamps, and a single translation', () => {
      const service = setup();

      const section = service.create(input());

      expect(section.slug).toBe('getting-started');
      expect(section.status).toBe('draft');
      expect(section.order).toBe(0);
      expect(section.createdAt).toBeTruthy();
      expect(section.updatedAt).toBeTruthy();
      expect(Object.keys(section.translations)).toEqual(['en']);
      expect(section.translations.en).toEqual({
        title: 'Getting started',
        description: 'Intro section',
      });
      expect(service.sections()).toEqual([section]);
    });

    it('appends new sections at the end of the order', () => {
      const service = setup();

      service.create(input({ slug: 'first' }));
      const second = service.create(input({ slug: 'second' }));

      expect(second.order).toBe(1);
    });

    it('round-trips a question through create unchanged', () => {
      const service = setup();
      const question = {
        text: 'Is this correct?',
        type: 'yes-no' as const,
        yesNoCorrectAnswer: 'yes' as const,
      };

      const created = service.create(
        input({ slug: 'with-question', translation: { title: 'With question', description: 'A', question } }),
      );

      expect(created.translations.en?.question).toEqual(question);
      expect(service.sections()[0].translations.en?.question).toEqual(question);
    });
  });

  describe('saveTranslation', () => {
    it('updates an existing translation without changing status', () => {
      const service = setup();
      const created = service.create(input({ slug: 'original' }));
      service.publish(created.slug);

      service.saveTranslation(
        created.slug,
        input({ slug: 'original', translation: { title: 'Updated', description: 'Intro section' } }),
      );

      const updated = service.sections().find((s) => s.slug === 'original');
      expect(updated?.translations.en?.title).toBe('Updated');
      expect(updated?.status).toBe('published');
    });

    it('adds a new language without dropping existing translations', () => {
      const service = setup();
      const created = service.create(input({ slug: 'multi' }));

      service.saveTranslation(
        created.slug,
        input({
          slug: 'multi',
          language: 'es',
          translation: { title: 'Empezando', description: 'Sección de introducción' },
        }),
      );

      const updated = service.sections().find((s) => s.slug === 'multi');
      expect(Object.keys(updated?.translations ?? {}).sort()).toEqual(['en', 'es']);
      expect(updated?.translations.en?.title).toBe('Getting started');
      expect(updated?.translations.es?.title).toBe('Empezando');
    });

    it('renames a section slug and re-keys it', () => {
      const service = setup();
      const created = service.create(input({ slug: 'old-slug' }));

      service.saveTranslation(created.slug, input({ slug: 'new-slug' }));

      expect(service.sections().find((s) => s.slug === 'old-slug')).toBeUndefined();
      const renamed = service.sections().find((s) => s.slug === 'new-slug');
      expect(renamed).toBeTruthy();
      expect(renamed?.translations.en?.title).toBe('Getting started');
    });

    it('updates the shared imageUrl', () => {
      const service = setup();
      const created = service.create(input({ slug: 'with-image' }));

      service.saveTranslation(
        created.slug,
        input({ slug: 'with-image', imageUrl: 'https://example.com/a.png' }),
      );

      expect(service.sections()[0].imageUrl).toBe('https://example.com/a.png');
    });
  });

  describe('staleLanguages propagation', () => {
    it('does not mark anything stale on create', () => {
      const service = setup();

      const section = service.create(input({ slug: 'fresh' }));

      expect(section.staleLanguages ?? {}).toEqual({});
    });

    it('does not mark other languages stale when adding a language for the first time', () => {
      const service = setup();
      const created = service.create(input({ slug: 'multi' }));

      service.saveTranslation(
        created.slug,
        input({
          slug: 'multi',
          language: 'es',
          translation: { title: 'Empezando', description: 'Intro' },
        }),
      );

      expect(service.sections()[0].staleLanguages ?? {}).toEqual({});
    });

    it('marks other existing languages stale, sourced from the edited language, when an existing translation is edited', () => {
      const service = setup();
      const created = service.create(input({ slug: 'multi' }));
      service.saveTranslation(
        created.slug,
        input({
          slug: 'multi',
          language: 'es',
          translation: { title: 'Empezando', description: 'Intro' },
        }),
      );
      service.saveTranslation(
        created.slug,
        input({
          slug: 'multi',
          language: 'fr',
          translation: { title: 'Pour commencer', description: 'Intro' },
        }),
      );

      service.saveTranslation(
        created.slug,
        input({ slug: 'multi', language: 'en', translation: { title: 'Getting started v2', description: 'Intro' } }),
      );

      const section = service.sections()[0];
      expect(section.staleLanguages).toEqual({ es: 'en', fr: 'en' });
    });

    it('clears the edited language from staleLanguages and flips propagation to the others', () => {
      const service = setup();
      const created = service.create(input({ slug: 'multi' }));
      service.saveTranslation(
        created.slug,
        input({ slug: 'multi', language: 'es', translation: { title: 'Empezando', description: 'Intro' } }),
      );
      service.saveTranslation(
        created.slug,
        input({ slug: 'multi', language: 'en', translation: { title: 'Getting started v2', description: 'Intro' } }),
      );
      expect(service.sections()[0].staleLanguages).toEqual({ es: 'en' });

      service.saveTranslation(
        created.slug,
        input({ slug: 'multi', language: 'es', translation: { title: 'Empezando v2', description: 'Intro' } }),
      );

      const section = service.sections()[0];
      expect(section.staleLanguages).toEqual({ en: 'es' });
    });

    it('does not mark anything stale when there is only one language', () => {
      const service = setup();
      const created = service.create(input({ slug: 'solo' }));

      service.saveTranslation(
        created.slug,
        input({ slug: 'solo', translation: { title: 'Getting started v2', description: 'Intro' } }),
      );

      expect(service.sections()[0].staleLanguages ?? {}).toEqual({});
    });

    it('does not mark other languages stale when re-saving a translation with identical text', () => {
      const service = setup();
      const created = service.create(input({ slug: 'multi' }));
      service.saveTranslation(
        created.slug,
        input({
          slug: 'multi',
          language: 'es',
          translation: { title: 'Empezando', description: 'Intro' },
        }),
      );

      service.saveTranslation(
        created.slug,
        input({ slug: 'multi', translation: { title: 'Getting started', description: 'Intro section' } }),
      );

      expect(service.sections()[0].staleLanguages ?? {}).toEqual({});
    });

    it('does not mark other languages stale when only the slug or imageUrl changes', () => {
      const service = setup();
      const created = service.create(input({ slug: 'multi' }));
      service.saveTranslation(
        created.slug,
        input({
          slug: 'multi',
          language: 'es',
          translation: { title: 'Empezando', description: 'Intro' },
        }),
      );

      service.saveTranslation(
        created.slug,
        input({
          slug: 'renamed',
          imageUrl: 'https://example.com/a.png',
          translation: { title: 'Getting started', description: 'Intro section' },
        }),
      );

      expect(service.sections()[0].staleLanguages ?? {}).toEqual({});
    });

    it('still marks others stale when the question changes even if title/description do not', () => {
      const service = setup();
      const created = service.create(
        input({
          slug: 'multi',
          translation: {
            title: 'Getting started',
            description: 'Intro section',
            question: { text: 'Q1', type: 'yes-no', yesNoCorrectAnswer: 'yes' },
          },
        }),
      );
      service.saveTranslation(
        created.slug,
        input({
          slug: 'multi',
          language: 'es',
          translation: { title: 'Empezando', description: 'Intro' },
        }),
      );

      service.saveTranslation(
        created.slug,
        input({
          slug: 'multi',
          translation: {
            title: 'Getting started',
            description: 'Intro section',
            question: { text: 'Q1 updated', type: 'yes-no', yesNoCorrectAnswer: 'yes' },
          },
        }),
      );

      expect(service.sections()[0].staleLanguages).toEqual({ es: 'en' });
    });
  });

  describe('publish / pause', () => {
    it('publish sets status to published', () => {
      const service = setup();
      const created = service.create(input({ slug: 'a' }));

      service.publish(created.slug);

      expect(service.sections()[0].status).toBe('published');
    });

    it('pause sets status to paused', () => {
      const service = setup();
      const created = service.create(input({ slug: 'a' }));
      service.publish(created.slug);

      service.pause(created.slug);

      expect(service.sections()[0].status).toBe('paused');
    });
  });

  describe('reorder', () => {
    it('rewrites order to match the given slug sequence', () => {
      const service = setup();
      const a = service.create(input({ slug: 'a' }));
      const b = service.create(input({ slug: 'b' }));
      const c = service.create(input({ slug: 'c' }));

      service.reorder([c.slug, a.slug, b.slug]);

      const bySlug = new Map(service.sections().map((s) => [s.slug, s.order]));
      expect(bySlug.get(c.slug)).toBe(0);
      expect(bySlug.get(a.slug)).toBe(1);
      expect(bySlug.get(b.slug)).toBe(2);
    });
  });

  describe('sections()', () => {
    it('exposes sections sorted by order', () => {
      const service = setup();
      const a = service.create(input({ slug: 'a' }));
      const b = service.create(input({ slug: 'b' }));
      service.reorder([b.slug, a.slug]);

      expect(service.sections().map((s) => s.slug)).toEqual([b.slug, a.slug]);
    });
  });

  describe('persistence', () => {
    it('persists created sections to localStorage', () => {
      const service = setup();
      service.create(input({ slug: 'a' }));

      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
      expect(stored).toHaveLength(1);
      expect(stored[0].translations.en.title).toBe('Getting started');
    });

    it('loads existing sections from localStorage on construction', () => {
      const first = setup();
      first.create(input({ slug: 'persisted' }));

      const second = setup();
      expect(second.sections()).toHaveLength(1);
      expect(second.sections()[0].translations.en?.title).toBe('Getting started');
    });

    it('falls back to an empty list when localStorage contains invalid JSON', () => {
      localStorage.setItem(STORAGE_KEY, '{not valid json');

      const service = setup();

      expect(service.sections()).toEqual([]);
    });

    it('filters out legacy entries that have no slug or no translations', () => {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify([
          {
            id: 'legacy-uuid',
            title: 'Legacy',
            imageUrl: '',
            status: 'draft',
            order: 0,
            createdAt: '',
            updatedAt: '',
          },
          {
            slug: 'valid-entry',
            imageUrl: '',
            status: 'draft',
            order: 1,
            createdAt: '',
            updatedAt: '',
            translations: { en: { title: 'Valid', description: '' } },
          },
          {
            slug: '',
            imageUrl: '',
            status: 'draft',
            order: 2,
            createdAt: '',
            updatedAt: '',
            translations: { en: { title: 'Empty slug', description: '' } },
          },
          {
            slug: 'no-translations',
            imageUrl: '',
            status: 'draft',
            order: 3,
            createdAt: '',
            updatedAt: '',
            translations: {},
          },
        ]),
      );

      const service = setup();

      expect(service.sections()).toHaveLength(1);
      expect(service.sections()[0].slug).toBe('valid-entry');
    });

    it('does not throw when localStorage is unavailable (e.g. during SSR)', () => {
      vi.stubGlobal('localStorage', undefined);

      let service!: SectionService;
      expect(() => (service = setup())).not.toThrow();
      expect(service.sections()).toEqual([]);
      expect(() => service.create(input({ slug: 'a' }))).not.toThrow();

      vi.unstubAllGlobals();
    });
  });
});

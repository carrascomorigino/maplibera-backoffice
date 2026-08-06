import { SectionService } from './section.service';

const STORAGE_KEY = 'guide-sections';

function setup(): SectionService {
  return new SectionService();
}

describe('SectionService', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('create', () => {
    it('creates a section with draft status, appended order, and timestamps', () => {
      const service = setup();

      const section = service.create({
        slug: 'getting-started',
        title: 'Getting started',
        description: 'Intro section',
        imageUrl: '',
      });

      expect(section.slug).toBe('getting-started');
      expect(section.status).toBe('draft');
      expect(section.order).toBe(0);
      expect(section.createdAt).toBeTruthy();
      expect(section.updatedAt).toBeTruthy();
      expect(service.sections()).toEqual([section]);
    });

    it('appends new sections at the end of the order', () => {
      const service = setup();

      service.create({ slug: 'first', title: 'First', description: 'A', imageUrl: '' });
      const second = service.create({ slug: 'second', title: 'Second', description: 'B', imageUrl: '' });

      expect(second.order).toBe(1);
    });

    it('round-trips a question through create and update unchanged', () => {
      const service = setup();
      const question = {
        text: 'Is this correct?',
        type: 'yes-no' as const,
        yesNoCorrectAnswer: 'yes' as const,
      };

      const created = service.create({
        slug: 'with-question',
        title: 'With question',
        description: 'A',
        imageUrl: '',
        question,
      });
      expect(created.question).toEqual(question);
      expect(service.sections()[0].question).toEqual(question);

      const updatedQuestion = { ...question, yesNoCorrectAnswer: 'no' as const };
      service.update(created.slug, { question: updatedQuestion });
      expect(service.sections()[0].question).toEqual(updatedQuestion);
    });
  });

  describe('update', () => {
    it('updates fields without changing status', () => {
      const service = setup();
      const created = service.create({ slug: 'original', title: 'Original', description: 'A', imageUrl: '' });
      service.publish(created.slug);

      service.update(created.slug, { title: 'Updated' });

      const updated = service.sections().find((s) => s.slug === created.slug);
      expect(updated?.title).toBe('Updated');
      expect(updated?.status).toBe('published');
    });

    it('renames a section slug and re-keys it', () => {
      const service = setup();
      const created = service.create({ slug: 'old-slug', title: 'A', description: 'B', imageUrl: '' });

      service.update(created.slug, { slug: 'new-slug' });

      expect(service.sections().find((s) => s.slug === 'old-slug')).toBeUndefined();
      const renamed = service.sections().find((s) => s.slug === 'new-slug');
      expect(renamed).toBeTruthy();
      expect(renamed?.title).toBe('A');
    });
  });

  describe('publish / pause', () => {
    it('publish sets status to published', () => {
      const service = setup();
      const created = service.create({ slug: 'a', title: 'A', description: 'B', imageUrl: '' });

      service.publish(created.slug);

      expect(service.sections()[0].status).toBe('published');
    });

    it('pause sets status to paused', () => {
      const service = setup();
      const created = service.create({ slug: 'a', title: 'A', description: 'B', imageUrl: '' });
      service.publish(created.slug);

      service.pause(created.slug);

      expect(service.sections()[0].status).toBe('paused');
    });
  });

  describe('reorder', () => {
    it('rewrites order to match the given slug sequence', () => {
      const service = setup();
      const a = service.create({ slug: 'a', title: 'A', description: '', imageUrl: '' });
      const b = service.create({ slug: 'b', title: 'B', description: '', imageUrl: '' });
      const c = service.create({ slug: 'c', title: 'C', description: '', imageUrl: '' });

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
      const a = service.create({ slug: 'a', title: 'A', description: '', imageUrl: '' });
      const b = service.create({ slug: 'b', title: 'B', description: '', imageUrl: '' });
      service.reorder([b.slug, a.slug]);

      expect(service.sections().map((s) => s.slug)).toEqual([b.slug, a.slug]);
    });
  });

  describe('persistence', () => {
    it('persists created sections to localStorage', () => {
      const service = setup();
      service.create({ slug: 'a', title: 'A', description: '', imageUrl: '' });

      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
      expect(stored).toHaveLength(1);
      expect(stored[0].title).toBe('A');
    });

    it('loads existing sections from localStorage on construction', () => {
      const first = setup();
      first.create({ slug: 'persisted', title: 'Persisted', description: '', imageUrl: '' });

      const second = setup();
      expect(second.sections()).toHaveLength(1);
      expect(second.sections()[0].title).toBe('Persisted');
    });

    it('falls back to an empty list when localStorage contains invalid JSON', () => {
      localStorage.setItem(STORAGE_KEY, '{not valid json');

      const service = setup();

      expect(service.sections()).toEqual([]);
    });

    it('filters out legacy entries that have no slug', () => {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify([
          { id: 'legacy-uuid', title: 'Legacy', description: '', imageUrl: '', status: 'draft', order: 0, createdAt: '', updatedAt: '' },
          { slug: 'valid-entry', title: 'Valid', description: '', imageUrl: '', status: 'draft', order: 1, createdAt: '', updatedAt: '' },
          { slug: '', title: 'Empty slug', description: '', imageUrl: '', status: 'draft', order: 2, createdAt: '', updatedAt: '' },
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
      expect(() =>
        service.create({ slug: 'a', title: 'A', description: '', imageUrl: '' }),
      ).not.toThrow();

      vi.unstubAllGlobals();
    });
  });
});

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
        title: 'Getting started',
        description: 'Intro section',
        imageUrl: '',
      });

      expect(section.id).toBeTruthy();
      expect(section.status).toBe('draft');
      expect(section.order).toBe(0);
      expect(section.createdAt).toBeTruthy();
      expect(section.updatedAt).toBeTruthy();
      expect(service.sections()).toEqual([section]);
    });

    it('appends new sections at the end of the order', () => {
      const service = setup();

      service.create({ title: 'First', description: 'A', imageUrl: '' });
      const second = service.create({ title: 'Second', description: 'B', imageUrl: '' });

      expect(second.order).toBe(1);
    });
  });

  describe('update', () => {
    it('updates fields without changing status', () => {
      const service = setup();
      const created = service.create({ title: 'Original', description: 'A', imageUrl: '' });
      service.publish(created.id);

      service.update(created.id, { title: 'Updated' });

      const updated = service.sections().find((s) => s.id === created.id);
      expect(updated?.title).toBe('Updated');
      expect(updated?.status).toBe('published');
    });
  });

  describe('publish / pause', () => {
    it('publish sets status to published', () => {
      const service = setup();
      const created = service.create({ title: 'A', description: 'B', imageUrl: '' });

      service.publish(created.id);

      expect(service.sections()[0].status).toBe('published');
    });

    it('pause sets status to paused', () => {
      const service = setup();
      const created = service.create({ title: 'A', description: 'B', imageUrl: '' });
      service.publish(created.id);

      service.pause(created.id);

      expect(service.sections()[0].status).toBe('paused');
    });
  });

  describe('reorder', () => {
    it('rewrites order to match the given id sequence', () => {
      const service = setup();
      const a = service.create({ title: 'A', description: '', imageUrl: '' });
      const b = service.create({ title: 'B', description: '', imageUrl: '' });
      const c = service.create({ title: 'C', description: '', imageUrl: '' });

      service.reorder([c.id, a.id, b.id]);

      const byId = new Map(service.sections().map((s) => [s.id, s.order]));
      expect(byId.get(c.id)).toBe(0);
      expect(byId.get(a.id)).toBe(1);
      expect(byId.get(b.id)).toBe(2);
    });
  });

  describe('sections()', () => {
    it('exposes sections sorted by order', () => {
      const service = setup();
      const a = service.create({ title: 'A', description: '', imageUrl: '' });
      const b = service.create({ title: 'B', description: '', imageUrl: '' });
      service.reorder([b.id, a.id]);

      expect(service.sections().map((s) => s.id)).toEqual([b.id, a.id]);
    });
  });

  describe('persistence', () => {
    it('persists created sections to localStorage', () => {
      const service = setup();
      service.create({ title: 'A', description: '', imageUrl: '' });

      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
      expect(stored).toHaveLength(1);
      expect(stored[0].title).toBe('A');
    });

    it('loads existing sections from localStorage on construction', () => {
      const first = setup();
      first.create({ title: 'Persisted', description: '', imageUrl: '' });

      const second = setup();
      expect(second.sections()).toHaveLength(1);
      expect(second.sections()[0].title).toBe('Persisted');
    });

    it('falls back to an empty list when localStorage contains invalid JSON', () => {
      localStorage.setItem(STORAGE_KEY, '{not valid json');

      const service = setup();

      expect(service.sections()).toEqual([]);
    });

    it('does not throw when localStorage is unavailable (e.g. during SSR)', () => {
      vi.stubGlobal('localStorage', undefined);

      let service!: SectionService;
      expect(() => (service = setup())).not.toThrow();
      expect(service.sections()).toEqual([]);
      expect(() => service.create({ title: 'A', description: '', imageUrl: '' })).not.toThrow();

      vi.unstubAllGlobals();
    });
  });
});

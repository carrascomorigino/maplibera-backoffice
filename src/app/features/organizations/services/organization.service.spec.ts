import { OrganizationService } from './organization.service';

const STORAGE_KEY = 'app-organizations';

function setup(): OrganizationService {
  return new OrganizationService();
}

function orgInput(overrides: { slug?: string; type?: 'local-group' | 'ngo' | 'social-network' | 'campaign' } = {}) {
  return {
    type: overrides.type ?? ('local-group' as const),
    slug: overrides.slug ?? 'friends-of-the-river',
    sharedFields: {
      logoUrl: 'https://example.com/logo.png',
      scopeType: 'global' as const,
      contactLinks: { website: 'https://example.com' },
    },
    language: 'en' as const,
    translation: { name: 'Friends of the River', description: 'A local river conservation group' },
  };
}

describe('OrganizationService', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('create', () => {
    it('creates an organization with draft status, order, and a single translation', () => {
      const service = setup();

      const org = service.create(orgInput());

      expect(org.type).toBe('local-group');
      expect(org.status).toBe('draft');
      expect(org.order).toBe(0);
      expect(Object.keys(org.translations)).toEqual(['en']);
      expect(service.organizations()).toEqual([org]);
    });

    it('assigns increasing order values across creations, regardless of type', () => {
      const service = setup();

      const first = service.create(orgInput({ slug: 'first' }));
      const second = service.create(orgInput({ slug: 'second', type: 'ngo' }));
      const third = service.create(orgInput({ slug: 'third' }));

      expect([first.order, second.order, third.order]).toEqual([0, 1, 2]);
    });
  });

  describe('organizations ordering', () => {
    it('sorts organizations by order ascending', () => {
      const service = setup();
      service.create(orgInput({ slug: 'first' }));
      service.create(orgInput({ slug: 'second' }));
      service.create(orgInput({ slug: 'third' }));

      expect(service.organizations().map((org) => org.slug)).toEqual(['first', 'second', 'third']);
    });
  });

  describe('saveTranslation / removeTranslation / staleLanguages', () => {
    it('adds a new language without dropping existing translations', () => {
      const service = setup();
      const created = service.create(orgInput());

      service.saveTranslation(created.slug, 'es', {
        name: 'Amigos del Río',
        description: 'Un grupo local de conservación del río',
      });

      const updated = service.organizations()[0];
      expect(Object.keys(updated.translations).sort()).toEqual(['en', 'es']);
    });

    it('marks other languages stale when an existing translation is edited', () => {
      const service = setup();
      const created = service.create(orgInput());
      service.saveTranslation(created.slug, 'es', {
        name: 'Amigos del Río',
        description: 'Un grupo local de conservación del río',
      });

      service.saveTranslation(created.slug, 'en', {
        name: 'Friends of the River v2',
        description: 'A local river conservation group',
      });

      expect(service.organizations()[0].staleLanguages).toEqual({ es: 'en' });
    });

    it('removeTranslation deletes the language and clears related staleLanguages entries', () => {
      const service = setup();
      const created = service.create(orgInput());
      service.saveTranslation(created.slug, 'es', {
        name: 'Amigos del Río',
        description: 'Un grupo local de conservación del río',
      });
      service.saveTranslation(created.slug, 'en', {
        name: 'Friends of the River v2',
        description: 'A local river conservation group',
      });
      expect(service.organizations()[0].staleLanguages).toEqual({ es: 'en' });

      service.removeTranslation(created.slug, 'es');

      const org = service.organizations()[0];
      expect(Object.keys(org.translations)).toEqual(['en']);
      expect(org.staleLanguages).toEqual({});
    });

    it('renames the slug when a newSlug is passed', () => {
      const service = setup();
      const created = service.create(orgInput());

      service.saveTranslation(
        created.slug,
        'en',
        { name: 'Friends of the River', description: 'A local river conservation group' },
        'river-guardians',
      );

      expect(service.organizations().find((o) => o.slug === created.slug)).toBeUndefined();
      expect(service.organizations().find((o) => o.slug === 'river-guardians')).toBeTruthy();
    });

    it('removeTranslation is a no-op when it would remove the last translation', () => {
      const service = setup();
      const created = service.create(orgInput());

      service.removeTranslation(created.slug, 'en');

      expect(Object.keys(service.organizations()[0].translations)).toEqual(['en']);
    });
  });

  describe('updateSharedFields', () => {
    it('updates shared fields without touching translations', () => {
      const service = setup();
      const created = service.create(orgInput());

      service.updateSharedFields(created.slug, {
        logoUrl: 'https://example.com/new-logo.png',
        scopeType: 'country',
        countryCode: 'AR',
        contactLinks: { website: 'https://example.com', instagram: 'https://instagram.com/example' },
      });

      const updated = service.organizations()[0];
      expect(updated.logoUrl).toBe('https://example.com/new-logo.png');
      expect(updated.scopeType).toBe('country');
      expect(updated.countryCode).toBe('AR');
      expect(updated.contactLinks.instagram).toBe('https://instagram.com/example');
      expect(updated.translations.en?.name).toBe('Friends of the River');
    });

    it('clears countryCode/city when they are omitted from a subsequent update', () => {
      const service = setup();
      const created = service.create(orgInput());
      service.updateSharedFields(created.slug, {
        logoUrl: 'https://example.com/logo.png',
        scopeType: 'city',
        city: 'Springfield',
        contactLinks: {},
      });
      expect(service.organizations()[0].city).toBe('Springfield');

      service.updateSharedFields(created.slug, {
        logoUrl: 'https://example.com/logo.png',
        scopeType: 'global',
        contactLinks: {},
      });

      expect(service.organizations()[0].city).toBeUndefined();
    });
  });

  describe('reorder', () => {
    it('rewrites order for all given slugs based on their position', () => {
      const service = setup();
      service.create(orgInput({ slug: 'first' }));
      service.create(orgInput({ slug: 'second' }));
      service.create(orgInput({ slug: 'third' }));

      service.reorder(['third', 'first', 'second']);

      expect(service.organizations().map((org) => org.slug)).toEqual(['third', 'first', 'second']);
    });
  });

  describe('publish / pause', () => {
    it('publish sets status to published, pause sets it to paused', () => {
      const service = setup();
      const created = service.create(orgInput());

      service.publish(created.slug);
      expect(service.organizations()[0].status).toBe('published');

      service.pause(created.slug);
      expect(service.organizations()[0].status).toBe('paused');
    });
  });

  describe('persistence', () => {
    it('persists created organizations to localStorage under its own key', () => {
      const service = setup();
      service.create(orgInput());

      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
      expect(stored).toHaveLength(1);
    });

    it('loads existing organizations from localStorage on construction', () => {
      const first = setup();
      first.create(orgInput());

      const second = setup();
      expect(second.organizations()).toHaveLength(1);
    });

    it('falls back to an empty list when localStorage contains invalid JSON', () => {
      localStorage.setItem(STORAGE_KEY, '{not valid json');

      const service = setup();

      expect(service.organizations()).toEqual([]);
    });

    it('does not throw when localStorage is unavailable (e.g. during SSR)', () => {
      vi.stubGlobal('localStorage', undefined);

      let service!: OrganizationService;
      expect(() => (service = setup())).not.toThrow();
      expect(service.organizations()).toEqual([]);
      expect(() => service.create(orgInput())).not.toThrow();

      vi.unstubAllGlobals();
    });
  });
});

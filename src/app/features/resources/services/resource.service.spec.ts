import { ResourceService } from './resource.service';
import { Resource } from '../models/resource.model';

const STORAGE_KEY = 'resources';

function setup(): ResourceService {
  return new ResourceService();
}

function nutritionResource(overrides: { slug?: string } = {}) {
  return {
    category: 'nutrition' as const,
    slug: overrides.slug ?? 'omega-3',
    sharedFields: { sourceLinks: [], pdfUrls: [] },
    language: 'en' as const,
    translation: { title: 'Omega 3', shortDescription: 'Good fats', explanatoryText: 'Details' },
  };
}

describe('ResourceService', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('create', () => {
    it('creates a resource with draft status and a single translation', () => {
      const service = setup();

      const resource = service.create(nutritionResource());

      expect(resource.category).toBe('nutrition');
      expect(resource.status).toBe('draft');
      expect(resource.order).toBe(0);
      expect(Object.keys(resource.translations)).toEqual(['en']);
      expect(service.resources()).toEqual([resource]);
    });

    it('scopes the initial order to the category, not the global list', () => {
      const service = setup();
      service.create(nutritionResource({ slug: 'first-nutrition' }));
      service.create({
        category: 'recipes',
        slug: 'first-recipe',
        sharedFields: { preparationMinutes: 10, photoUrls: [] },
        language: 'en',
        translation: { title: 'Soup', shortDescription: 'Warm', ingredients: [], steps: [] },
      });

      const secondNutrition = service.create(nutritionResource({ slug: 'second-nutrition' }));
      const secondRecipe = service.create({
        category: 'recipes',
        slug: 'second-recipe',
        sharedFields: { preparationMinutes: 5, photoUrls: [] },
        language: 'en',
        translation: { title: 'Salad', shortDescription: 'Cold', ingredients: [], steps: [] },
      });

      expect(secondNutrition.order).toBe(1);
      expect(secondRecipe.order).toBe(1);
    });
  });

  describe('saveTranslation / removeTranslation / staleLanguages', () => {
    it('adds a new language without dropping existing translations', () => {
      const service = setup();
      const created = service.create(nutritionResource());

      service.saveTranslation(created.slug, 'es', {
        title: 'Omega 3 es',
        shortDescription: 'Buenas grasas',
        explanatoryText: 'Detalles',
      });

      const updated = service.resources()[0];
      expect(Object.keys(updated.translations).sort()).toEqual(['en', 'es']);
    });

    it('marks other languages stale when an existing translation is edited', () => {
      const service = setup();
      const created = service.create(nutritionResource());
      service.saveTranslation(created.slug, 'es', {
        title: 'Omega 3 es',
        shortDescription: 'Buenas grasas',
        explanatoryText: 'Detalles',
      });

      service.saveTranslation(created.slug, 'en', {
        title: 'Omega 3 v2',
        shortDescription: 'Good fats',
        explanatoryText: 'Details',
      });

      expect(service.resources()[0].staleLanguages).toEqual({ es: 'en' });
    });

    it('removeTranslation deletes the language and clears related staleLanguages entries', () => {
      const service = setup();
      const created = service.create(nutritionResource());
      service.saveTranslation(created.slug, 'es', {
        title: 'Omega 3 es',
        shortDescription: 'Buenas grasas',
        explanatoryText: 'Detalles',
      });
      service.saveTranslation(created.slug, 'en', {
        title: 'Omega 3 v2',
        shortDescription: 'Good fats',
        explanatoryText: 'Details',
      });
      expect(service.resources()[0].staleLanguages).toEqual({ es: 'en' });

      service.removeTranslation(created.slug, 'es');

      const resource = service.resources()[0];
      expect(Object.keys(resource.translations)).toEqual(['en']);
      expect(resource.staleLanguages).toEqual({});
    });

    it('renames the slug when a newSlug is passed', () => {
      const service = setup();
      const created = service.create(nutritionResource());

      service.saveTranslation(
        created.slug,
        'en',
        { title: 'Omega 3', shortDescription: 'Good fats', explanatoryText: 'Details' },
        'omega-3-fatty-acids',
      );

      expect(service.resources().find((r) => r.slug === created.slug)).toBeUndefined();
      expect(service.resources().find((r) => r.slug === 'omega-3-fatty-acids')).toBeTruthy();
    });

    it('removeTranslation is a no-op when it would remove the last translation', () => {
      const service = setup();
      const created = service.create(nutritionResource());

      service.removeTranslation(created.slug, 'en');

      expect(Object.keys(service.resources()[0].translations)).toEqual(['en']);
    });
  });

  describe('updateSharedFields', () => {
    it('updates category-specific shared fields without touching translations', () => {
      const service = setup();
      const created = service.create(nutritionResource());

      service.updateSharedFields(created.slug, {
        sourceLinks: ['https://example.com/study'],
        pdfUrls: [],
      });

      const updated = service.resources()[0] as Resource & { sourceLinks: string[] };
      expect(updated.sourceLinks).toEqual(['https://example.com/study']);
      expect(updated.translations.en?.title).toBe('Omega 3');
    });
  });

  describe('reorder', () => {
    it('only rewrites order for members of the given category', () => {
      const service = setup();
      const a = service.create(nutritionResource({ slug: 'a' }));
      const b = service.create(nutritionResource({ slug: 'b' }));
      const c = service.create(nutritionResource({ slug: 'c' }));
      const recipe = service.create({
        category: 'recipes',
        slug: 'a-recipe',
        sharedFields: { preparationMinutes: 10, photoUrls: [] },
        language: 'en',
        translation: { title: 'Soup', shortDescription: 'Warm', ingredients: [], steps: [] },
      });

      service.reorder('nutrition', [c.slug, a.slug, b.slug]);

      const bySlug = new Map(service.resources().map((r) => [r.slug, r.order]));
      expect(bySlug.get(c.slug)).toBe(0);
      expect(bySlug.get(a.slug)).toBe(1);
      expect(bySlug.get(b.slug)).toBe(2);
      expect(bySlug.get(recipe.slug)).toBe(0);
    });
  });

  describe('publish / pause', () => {
    it('publish sets status to published, pause sets it to paused', () => {
      const service = setup();
      const created = service.create(nutritionResource());

      service.publish(created.slug);
      expect(service.resources()[0].status).toBe('published');

      service.pause(created.slug);
      expect(service.resources()[0].status).toBe('paused');
    });
  });

  describe('resourcesByCategory', () => {
    it('groups resources by category', () => {
      const service = setup();
      service.create(nutritionResource());
      service.create({
        category: 'apps',
        slug: 'an-app',
        sharedFields: { iconUrl: '' },
        language: 'en',
        translation: { title: 'An app', shortDescription: 'Useful' },
      });

      const grouped = service.resourcesByCategory();

      expect(grouped.nutrition).toHaveLength(1);
      expect(grouped.apps).toHaveLength(1);
      expect(grouped.recipes).toHaveLength(0);
      expect(grouped.multimedia).toHaveLength(0);
    });
  });

  describe('persistence', () => {
    it('persists created resources to localStorage under its own key', () => {
      const service = setup();
      service.create(nutritionResource());

      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
      expect(stored).toHaveLength(1);
    });

    it('loads existing resources from localStorage on construction', () => {
      const first = setup();
      first.create(nutritionResource());

      const second = setup();
      expect(second.resources()).toHaveLength(1);
    });

    it('falls back to an empty list when localStorage contains invalid JSON', () => {
      localStorage.setItem(STORAGE_KEY, '{not valid json');

      const service = setup();

      expect(service.resources()).toEqual([]);
    });

    it('does not throw when localStorage is unavailable (e.g. during SSR)', () => {
      vi.stubGlobal('localStorage', undefined);

      let service!: ResourceService;
      expect(() => (service = setup())).not.toThrow();
      expect(service.resources()).toEqual([]);
      expect(() => service.create(nutritionResource())).not.toThrow();

      vi.unstubAllGlobals();
    });
  });
});

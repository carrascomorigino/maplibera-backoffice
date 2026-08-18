import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { SectionService, SectionTranslationInput } from './section.service';
import { Section } from '../models/section.model';

const BASE_URL = '/backend/sections';

function input(overrides: Partial<SectionTranslationInput> = {}): SectionTranslationInput {
  return {
    slug: 'getting-started',
    imageUrl: '',
    language: 'en',
    translation: { title: 'Getting started', description: 'Intro section' },
    ...overrides,
  };
}

function section(overrides: Partial<Section> = {}): Section {
  return {
    id: 's1',
    slug: 'getting-started',
    imageUrl: '',
    status: 'draft',
    order: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    translations: { en: { title: 'Getting started', description: 'Intro section' } },
    ...overrides,
  };
}

describe('SectionService', () => {
  let service: SectionService;
  let httpMock: HttpTestingController;

  async function setup(initial: Section[] = []): Promise<void> {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(SectionService);
    httpMock = TestBed.inject(HttpTestingController);

    const req = httpMock.expectOne(BASE_URL);
    expect(req.request.method).toBe('GET');
    req.flush(initial);
    await Promise.resolve();
  }

  afterEach(() => {
    httpMock.verify();
  });

  describe('initial load', () => {
    it('fetches sections from the backend on construction', async () => {
      await setup([section()]);

      expect(service.sections()).toEqual([section()]);
    });
  });

  describe('create', () => {
    it('POSTs the input and appends the returned section to the list', async () => {
      await setup([]);

      const promise = service.create(input());
      const req = httpMock.expectOne(BASE_URL);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(input());
      req.flush(section());

      await expect(promise).resolves.toEqual(section());
      expect(service.sections()).toEqual([section()]);
    });
  });

  describe('saveTranslation', () => {
    it('PUTs to /:id and replaces the matching section in the list', async () => {
      await setup([section()]);
      const updated = section({ translations: { en: { title: 'Updated', description: 'Intro section' } } });

      const promise = service.saveTranslation('s1', input({ translation: updated.translations.en! }));
      const req = httpMock.expectOne(`${BASE_URL}/s1`);
      expect(req.request.method).toBe('PUT');
      req.flush(updated);

      await expect(promise).resolves.toEqual(updated);
      expect(service.sections()).toEqual([updated]);
    });
  });

  describe('removeTranslation', () => {
    it('DELETEs /:id/translations/:language and replaces the section', async () => {
      await setup([section()]);
      const updated = section({ translations: { en: { title: 'Getting started', description: 'Intro section' } } });

      const promise = service.removeTranslation('s1', 'es');
      const req = httpMock.expectOne(`${BASE_URL}/s1/translations/es`);
      expect(req.request.method).toBe('DELETE');
      req.flush(updated);

      await expect(promise).resolves.toEqual(updated);
    });
  });

  describe('publish / pause', () => {
    it('publish POSTs to /:id/publish and updates status locally', async () => {
      await setup([section()]);
      const published = section({ status: 'published' });

      const promise = service.publish('s1');
      const req = httpMock.expectOne(`${BASE_URL}/s1/publish`);
      expect(req.request.method).toBe('POST');
      req.flush(published);

      await expect(promise).resolves.toEqual(published);
      expect(service.sections()[0].status).toBe('published');
    });

    it('pause POSTs to /:id/pause and updates status locally', async () => {
      await setup([section({ status: 'published' })]);
      const paused = section({ status: 'paused' });

      const promise = service.pause('s1');
      const req = httpMock.expectOne(`${BASE_URL}/s1/pause`);
      expect(req.request.method).toBe('POST');
      req.flush(paused);

      await expect(promise).resolves.toEqual(paused);
      expect(service.sections()[0].status).toBe('paused');
    });
  });

  describe('reorder', () => {
    it('POSTs the ordered ids and rewrites local order to match', async () => {
      await setup([section({ id: 'a', order: 0 }), section({ id: 'b', order: 1 })]);

      const promise = service.reorder(['b', 'a']);
      const req = httpMock.expectOne(`${BASE_URL}/reorder`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ orderedIds: ['b', 'a'] });
      req.flush(null);
      await promise;

      const byId = new Map(service.sections().map((s) => [s.id, s.order]));
      expect(byId.get('b')).toBe(0);
      expect(byId.get('a')).toBe(1);
    });
  });

  describe('sections()', () => {
    it('exposes sections sorted by order', async () => {
      await setup([section({ id: 'a', order: 1 }), section({ id: 'b', order: 0 })]);

      expect(service.sections().map((s) => s.id)).toEqual(['b', 'a']);
    });
  });

  describe('error handling', () => {
    it('rejects when the backend responds with an error', async () => {
      await setup([]);

      const promise = service.create(input());
      const req = httpMock.expectOne(BASE_URL);
      req.flush({ error: 'ConflictError' }, { status: 409, statusText: 'Conflict' });

      await expect(promise).rejects.toBeTruthy();
    });
  });
});

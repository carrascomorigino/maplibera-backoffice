import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { ResourceCreateInput, ResourceService } from './resource.service';
import { Resource } from '../models/resource.model';

const BASE_URL = '/backend/resources';

function createInput(overrides: Partial<ResourceCreateInput> = {}): ResourceCreateInput {
  return {
    category: 'nutrition',
    slug: 'protein',
    sharedFields: { sourceLinks: [], pdfUrls: [] },
    language: 'en',
    translation: { title: 'Protein', shortDescription: 'short' },
    ...overrides,
  } as ResourceCreateInput;
}

function resource(overrides: Partial<Resource> = {}): Resource {
  return {
    id: 'r1',
    slug: 'protein',
    category: 'nutrition',
    status: 'draft',
    order: 0,
    sourceLinks: [],
    pdfUrls: [],
    images: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    translations: { en: { title: 'Protein', shortDescription: 'short' } },
    ...overrides,
  } as Resource;
}

describe('ResourceService', () => {
  let service: ResourceService;
  let httpMock: HttpTestingController;

  async function setup(initial: Resource[] = []): Promise<void> {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ResourceService);
    httpMock = TestBed.inject(HttpTestingController);

    const req = httpMock.expectOne(BASE_URL);
    expect(req.request.method).toBe('GET');
    req.flush(initial);
    await Promise.resolve();
  }

  afterEach(() => {
    httpMock.verify();
  });

  it('fetches resources from the backend on construction', async () => {
    await setup([resource()]);

    expect(service.resources()).toEqual([resource()]);
  });

  it('groups resources by category in RESOURCE_CATEGORIES order', async () => {
    await setup([
      resource({ id: 'a', category: 'apps' }),
      resource({ id: 'n', category: 'nutrition' }),
    ]);

    const byCategory = service.resourcesByCategory();
    expect(byCategory.nutrition.map((r) => r.id)).toEqual(['n']);
    expect(byCategory.apps.map((r) => r.id)).toEqual(['a']);
    expect(byCategory.recipes).toEqual([]);
    expect(byCategory.multimedia).toEqual([]);
  });

  it('POSTs the input on create and appends the returned resource', async () => {
    await setup([]);

    const promise = service.create(createInput());
    const req = httpMock.expectOne(BASE_URL);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(createInput());
    req.flush(resource());

    await expect(promise).resolves.toEqual(resource());
    expect(service.resources()).toEqual([resource()]);
  });

  it('PUTs to /:id/translations on saveTranslation', async () => {
    await setup([resource()]);
    const updated = resource({
      translations: { en: { title: 'Updated', shortDescription: 'short' } },
    });

    const promise = service.saveTranslation('r1', 'en', updated.translations.en!, 'protein');
    const req = httpMock.expectOne(`${BASE_URL}/r1/translations`);
    expect(req.request.method).toBe('PUT');
    req.flush(updated);

    await expect(promise).resolves.toEqual(updated);
  });

  it('DELETEs /:id/translations/:language on removeTranslation', async () => {
    await setup([resource()]);
    const updated = resource({ translations: {} });

    const promise = service.removeTranslation('r1', 'en');
    const req = httpMock.expectOne(`${BASE_URL}/r1/translations/en`);
    expect(req.request.method).toBe('DELETE');
    req.flush(updated);

    await expect(promise).resolves.toEqual(updated);
  });

  it('PATCHes /:id/shared-fields on updateSharedFields', async () => {
    await setup([resource()]);
    const sharedFields = { sourceLinks: ['https://example.com'], pdfUrls: [] };
    const updated = resource(sharedFields);

    const promise = service.updateSharedFields('r1', sharedFields);
    const req = httpMock.expectOne(`${BASE_URL}/r1/shared-fields`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ sharedFields });
    req.flush(updated);

    await expect(promise).resolves.toEqual(updated);
  });

  it('DELETEs /:id on delete and removes the resource from the list', async () => {
    await setup([resource({ id: 'a' }), resource({ id: 'b' })]);

    const promise = service.delete('a');
    const req = httpMock.expectOne(`${BASE_URL}/a`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);

    await promise;
    expect(service.resources().map((r) => r.id)).toEqual(['b']);
  });

  it('publish/pause POST to /:id/publish and /:id/pause', async () => {
    await setup([resource()]);

    const publishPromise = service.publish('r1');
    httpMock.expectOne(`${BASE_URL}/r1/publish`).flush(resource({ status: 'published' }));
    await expect(publishPromise).resolves.toMatchObject({ status: 'published' });

    const pausePromise = service.pause('r1');
    httpMock.expectOne(`${BASE_URL}/r1/pause`).flush(resource({ status: 'paused' }));
    await expect(pausePromise).resolves.toMatchObject({ status: 'paused' });
  });

  it('reorder POSTs category + ordered ids and rewrites local order within that category only', async () => {
    await setup([
      resource({ id: 'n1', category: 'nutrition', order: 0 }),
      resource({ id: 'n2', category: 'nutrition', order: 1 }),
      resource({ id: 'a1', category: 'apps', order: 0 }),
    ]);

    const promise = service.reorder('nutrition', ['n2', 'n1']);
    const req = httpMock.expectOne(`${BASE_URL}/reorder`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ category: 'nutrition', orderedIds: ['n2', 'n1'] });
    req.flush(null);
    await promise;

    const byId = new Map(service.resources().map((r) => [r.id, r.order]));
    expect(byId.get('n2')).toBe(0);
    expect(byId.get('n1')).toBe(1);
    expect(byId.get('a1')).toBe(0);
  });

  it('rejects when the backend responds with an error', async () => {
    await setup([]);

    const promise = service.create(createInput());
    httpMock.expectOne(BASE_URL).flush({ error: 'ConflictError' }, { status: 409, statusText: 'Conflict' });

    await expect(promise).rejects.toBeTruthy();
  });
});

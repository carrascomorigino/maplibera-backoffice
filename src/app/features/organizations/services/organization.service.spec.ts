import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { OrganizationCreateInput, OrganizationService } from './organization.service';
import { Organization } from '../models/organization.model';

const BASE_URL = '/backend/organizations';

function createInput(overrides: Partial<OrganizationCreateInput> = {}): OrganizationCreateInput {
  return {
    type: 'ngo',
    slug: 'org-one',
    sharedFields: { logoUrl: 'https://example.com/l.png', scopeType: 'global', contactLinks: {} },
    language: 'en',
    translation: { name: 'Org One', description: 'Desc' },
    ...overrides,
  };
}

function org(overrides: Partial<Organization> = {}): Organization {
  return {
    id: 'o1',
    slug: 'org-one',
    type: 'ngo',
    status: 'draft',
    order: 0,
    logoUrl: 'https://example.com/l.png',
    scopeType: 'global',
    contactLinks: {},
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    translations: { en: { name: 'Org One', description: 'Desc' } },
    ...overrides,
  };
}

describe('OrganizationService', () => {
  let service: OrganizationService;
  let httpMock: HttpTestingController;

  async function setup(initial: Organization[] = []): Promise<void> {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(OrganizationService);
    httpMock = TestBed.inject(HttpTestingController);

    const req = httpMock.expectOne(BASE_URL);
    expect(req.request.method).toBe('GET');
    req.flush(initial);
    await Promise.resolve();
  }

  afterEach(() => {
    httpMock.verify();
  });

  it('fetches organizations from the backend on construction', async () => {
    await setup([org()]);

    expect(service.organizations()).toEqual([org()]);
  });

  it('POSTs the input on create and appends the returned org', async () => {
    await setup([]);

    const promise = service.create(createInput());
    const req = httpMock.expectOne(BASE_URL);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(createInput());
    req.flush(org());

    await expect(promise).resolves.toEqual(org());
    expect(service.organizations()).toEqual([org()]);
  });

  it('PUTs to /:id/translations on saveTranslation and replaces the org', async () => {
    await setup([org()]);
    const updated = org({ translations: { en: { name: 'Renamed', description: 'Desc' } } });

    const promise = service.saveTranslation('o1', 'en', updated.translations.en!, 'org-one');
    const req = httpMock.expectOne(`${BASE_URL}/o1/translations`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ language: 'en', translation: updated.translations.en, newSlug: 'org-one' });
    req.flush(updated);

    await expect(promise).resolves.toEqual(updated);
  });

  it('DELETEs /:id/translations/:language on removeTranslation', async () => {
    await setup([org()]);
    const updated = org({ translations: {} });

    const promise = service.removeTranslation('o1', 'en');
    const req = httpMock.expectOne(`${BASE_URL}/o1/translations/en`);
    expect(req.request.method).toBe('DELETE');
    req.flush(updated);

    await expect(promise).resolves.toEqual(updated);
  });

  it('PATCHes /:id/shared-fields on updateSharedFields', async () => {
    await setup([org()]);
    const sharedFields = { logoUrl: 'https://example.com/new.png', scopeType: 'global' as const, contactLinks: {} };
    const updated = org({ logoUrl: sharedFields.logoUrl });

    const promise = service.updateSharedFields('o1', sharedFields);
    const req = httpMock.expectOne(`${BASE_URL}/o1/shared-fields`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ sharedFields });
    req.flush(updated);

    await expect(promise).resolves.toEqual(updated);
  });

  it('publish/pause POST to /:id/publish and /:id/pause', async () => {
    await setup([org()]);

    const publishPromise = service.publish('o1');
    httpMock.expectOne(`${BASE_URL}/o1/publish`).flush(org({ status: 'published' }));
    await expect(publishPromise).resolves.toMatchObject({ status: 'published' });

    const pausePromise = service.pause('o1');
    httpMock.expectOne(`${BASE_URL}/o1/pause`).flush(org({ status: 'paused' }));
    await expect(pausePromise).resolves.toMatchObject({ status: 'paused' });
  });

  it('reorder POSTs the ordered ids and rewrites local order', async () => {
    await setup([org({ id: 'a', order: 0 }), org({ id: 'b', order: 1 })]);

    const promise = service.reorder(['b', 'a']);
    const req = httpMock.expectOne(`${BASE_URL}/reorder`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ orderedIds: ['b', 'a'] });
    req.flush(null);
    await promise;

    const byId = new Map(service.organizations().map((o) => [o.id, o.order]));
    expect(byId.get('b')).toBe(0);
    expect(byId.get('a')).toBe(1);
  });

  it('exposes organizations sorted by order', async () => {
    await setup([org({ id: 'a', order: 1 }), org({ id: 'b', order: 0 })]);

    expect(service.organizations().map((o) => o.id)).toEqual(['b', 'a']);
  });

  it('rejects when the backend responds with an error', async () => {
    await setup([]);

    const promise = service.create(createInput());
    httpMock.expectOne(BASE_URL).flush({ error: 'ConflictError' }, { status: 409, statusText: 'Conflict' });

    await expect(promise).rejects.toBeTruthy();
  });
});

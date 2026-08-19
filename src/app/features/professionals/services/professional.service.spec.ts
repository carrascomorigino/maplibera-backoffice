import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { ProfessionalCreateInput, ProfessionalService } from './professional.service';
import { Professional } from '../models/professional.model';

const BASE_URL = '/backend/professionals';

function createInput(overrides: Partial<ProfessionalCreateInput> = {}): ProfessionalCreateInput {
  return {
    specialty: 'nutritionist',
    slug: 'jane-doe',
    sharedFields: {
      photoUrl: 'https://example.com/jane.png',
      scopeType: 'global',
      contactLinks: {},
      licenseNumber: 'AB123',
      dietarySpecialties: [],
    },
    language: 'en',
    translation: { name: 'Jane Doe', credentialsTitle: 'RD', bio: 'Plant-based nutritionist' },
    ...overrides,
  } as ProfessionalCreateInput;
}

function professional(overrides: Partial<Professional> = {}): Professional {
  return {
    id: 'p1',
    slug: 'jane-doe',
    specialty: 'nutritionist',
    status: 'draft',
    order: 0,
    photoUrl: 'https://example.com/jane.png',
    scopeType: 'global',
    contactLinks: {},
    licenseNumber: 'AB123',
    dietarySpecialties: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    translations: { en: { name: 'Jane Doe', credentialsTitle: 'RD', bio: 'Plant-based nutritionist' } },
    ...overrides,
  } as Professional;
}

describe('ProfessionalService', () => {
  let service: ProfessionalService;
  let httpMock: HttpTestingController;

  async function setup(initial: Professional[] = []): Promise<void> {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ProfessionalService);
    httpMock = TestBed.inject(HttpTestingController);

    const req = httpMock.expectOne(BASE_URL);
    expect(req.request.method).toBe('GET');
    req.flush(initial);
    await Promise.resolve();
  }

  afterEach(() => {
    httpMock.verify();
  });

  it('fetches professionals from the backend on construction', async () => {
    await setup([professional()]);

    expect(service.professionals()).toEqual([professional()]);
  });

  it('groups professionals by specialty in PROFESSIONAL_SPECIALTIES order', async () => {
    await setup([
      professional({ id: 'c', specialty: 'coach', certifications: [], coachingAreas: [] } as Partial<Professional>),
      professional({ id: 'n', specialty: 'nutritionist' }),
    ]);

    const bySpecialty = service.professionalsBySpecialty();
    expect(bySpecialty.nutritionist.map((p) => p.id)).toEqual(['n']);
    expect(bySpecialty.coach.map((p) => p.id)).toEqual(['c']);
    expect(bySpecialty.doctor).toEqual([]);
    expect(bySpecialty.dentist).toEqual([]);
  });

  it('POSTs the input on create and appends the returned professional', async () => {
    await setup([]);

    const promise = service.create(createInput());
    const req = httpMock.expectOne(BASE_URL);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(createInput());
    req.flush(professional());

    await expect(promise).resolves.toEqual(professional());
    expect(service.professionals()).toEqual([professional()]);
  });

  it('PUTs to /:id/translations on saveTranslation', async () => {
    await setup([professional()]);
    const updated = professional({
      translations: { en: { name: 'Updated', credentialsTitle: 'RD', bio: 'Bio' } },
    });

    const promise = service.saveTranslation('p1', 'en', updated.translations.en!, 'jane-doe');
    const req = httpMock.expectOne(`${BASE_URL}/p1/translations`);
    expect(req.request.method).toBe('PUT');
    req.flush(updated);

    await expect(promise).resolves.toEqual(updated);
  });

  it('DELETEs /:id/translations/:language on removeTranslation', async () => {
    await setup([professional()]);
    const updated = professional({ translations: {} });

    const promise = service.removeTranslation('p1', 'en');
    const req = httpMock.expectOne(`${BASE_URL}/p1/translations/en`);
    expect(req.request.method).toBe('DELETE');
    req.flush(updated);

    await expect(promise).resolves.toEqual(updated);
  });

  it('PATCHes /:id/shared-fields on updateSharedFields', async () => {
    await setup([professional()]);
    const sharedFields = { licenseNumber: 'CD456', dietarySpecialties: ['clinical'] };
    const updated = professional(sharedFields);

    const promise = service.updateSharedFields('p1', sharedFields);
    const req = httpMock.expectOne(`${BASE_URL}/p1/shared-fields`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ sharedFields });
    req.flush(updated);

    await expect(promise).resolves.toEqual(updated);
  });

  it('publish/pause POST to /:id/publish and /:id/pause', async () => {
    await setup([professional()]);

    const publishPromise = service.publish('p1');
    httpMock.expectOne(`${BASE_URL}/p1/publish`).flush(professional({ status: 'published' }));
    await expect(publishPromise).resolves.toMatchObject({ status: 'published' });

    const pausePromise = service.pause('p1');
    httpMock.expectOne(`${BASE_URL}/p1/pause`).flush(professional({ status: 'paused' }));
    await expect(pausePromise).resolves.toMatchObject({ status: 'paused' });
  });

  it('reorder POSTs specialty + ordered ids and rewrites local order within that specialty only', async () => {
    await setup([
      professional({ id: 'n1', specialty: 'nutritionist', order: 0 }),
      professional({ id: 'n2', specialty: 'nutritionist', order: 1 }),
      professional({
        id: 'd1',
        specialty: 'doctor',
        order: 0,
        medicalLicenseNumber: 'X',
        medicalSpecialty: 'General',
      } as Partial<Professional>),
    ]);

    const promise = service.reorder('nutritionist', ['n2', 'n1']);
    const req = httpMock.expectOne(`${BASE_URL}/reorder`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ specialty: 'nutritionist', orderedIds: ['n2', 'n1'] });
    req.flush(null);
    await promise;

    const byId = new Map(service.professionals().map((p) => [p.id, p.order]));
    expect(byId.get('n2')).toBe(0);
    expect(byId.get('n1')).toBe(1);
    expect(byId.get('d1')).toBe(0);
  });

  it('rejects when the backend responds with an error', async () => {
    await setup([]);

    const promise = service.create(createInput());
    httpMock.expectOne(BASE_URL).flush({ error: 'ConflictError' }, { status: 409, statusText: 'Conflict' });

    await expect(promise).rejects.toBeTruthy();
  });
});

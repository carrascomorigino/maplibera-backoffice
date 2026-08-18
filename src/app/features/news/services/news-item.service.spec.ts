import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { NewsItemCreateInput, NewsItemService } from './news-item.service';
import { NewsItem } from '../models/news-item.model';

const BASE_URL = '/backend/news';

function createInput(overrides: Partial<NewsItemCreateInput> = {}): NewsItemCreateInput {
  return {
    category: 'news',
    slug: 'news-one',
    sharedFields: { imageUrl: 'https://example.com/n.jpg', publishedAt: '2026-01-01', sourceLinks: [] },
    language: 'en',
    translation: { title: 'News One', subtitle: 'Sub', description: 'Desc' },
    ...overrides,
  };
}

function item(overrides: Partial<NewsItem> = {}): NewsItem {
  return {
    id: 'n1',
    slug: 'news-one',
    category: 'news',
    status: 'draft',
    imageUrl: 'https://example.com/n.jpg',
    publishedAt: '2026-01-01',
    sourceLinks: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    translations: { en: { title: 'News One', subtitle: 'Sub', description: 'Desc' } },
    ...overrides,
  };
}

describe('NewsItemService', () => {
  let service: NewsItemService;
  let httpMock: HttpTestingController;

  async function setup(initial: NewsItem[] = []): Promise<void> {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(NewsItemService);
    httpMock = TestBed.inject(HttpTestingController);

    const req = httpMock.expectOne(BASE_URL);
    expect(req.request.method).toBe('GET');
    req.flush(initial);
    await Promise.resolve();
  }

  afterEach(() => {
    httpMock.verify();
  });

  it('fetches items from the backend on construction', async () => {
    await setup([item()]);

    expect(service.items()).toEqual([item()]);
  });

  it('POSTs the input on create and appends the returned item', async () => {
    await setup([]);

    const promise = service.create(createInput());
    const req = httpMock.expectOne(BASE_URL);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(createInput());
    req.flush(item());

    await expect(promise).resolves.toEqual(item());
    expect(service.items()).toEqual([item()]);
  });

  it('PUTs to /:id/translations on saveTranslation', async () => {
    await setup([item()]);
    const updated = item({ translations: { en: { title: 'Updated', subtitle: 'Sub', description: 'Desc' } } });

    const promise = service.saveTranslation('n1', 'en', updated.translations.en!, 'news-one');
    const req = httpMock.expectOne(`${BASE_URL}/n1/translations`);
    expect(req.request.method).toBe('PUT');
    req.flush(updated);

    await expect(promise).resolves.toEqual(updated);
  });

  it('DELETEs /:id/translations/:language on removeTranslation', async () => {
    await setup([item()]);
    const updated = item({ translations: {} });

    const promise = service.removeTranslation('n1', 'en');
    const req = httpMock.expectOne(`${BASE_URL}/n1/translations/en`);
    expect(req.request.method).toBe('DELETE');
    req.flush(updated);

    await expect(promise).resolves.toEqual(updated);
  });

  it('PATCHes /:id/shared-fields on updateSharedFields', async () => {
    await setup([item()]);
    const sharedFields = { imageUrl: 'https://example.com/new.jpg', publishedAt: '2026-02-01', sourceLinks: [] };
    const updated = item(sharedFields);

    const promise = service.updateSharedFields('n1', sharedFields);
    const req = httpMock.expectOne(`${BASE_URL}/n1/shared-fields`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ sharedFields });
    req.flush(updated);

    await expect(promise).resolves.toEqual(updated);
  });

  it('publish/pause POST to /:id/publish and /:id/pause', async () => {
    await setup([item()]);

    const publishPromise = service.publish('n1');
    httpMock.expectOne(`${BASE_URL}/n1/publish`).flush(item({ status: 'published' }));
    await expect(publishPromise).resolves.toMatchObject({ status: 'published' });

    const pausePromise = service.pause('n1');
    httpMock.expectOne(`${BASE_URL}/n1/pause`).flush(item({ status: 'paused' }));
    await expect(pausePromise).resolves.toMatchObject({ status: 'paused' });
  });

  it('sorts items by publishedAt desc, then createdAt desc', async () => {
    await setup([
      item({ id: 'a', publishedAt: '2026-01-01', createdAt: '2026-01-01T00:00:00.000Z' }),
      item({ id: 'b', publishedAt: '2026-02-01', createdAt: '2026-01-01T00:00:00.000Z' }),
      item({ id: 'c', publishedAt: '2026-02-01', createdAt: '2026-02-02T00:00:00.000Z' }),
    ]);

    expect(service.items().map((i) => i.id)).toEqual(['c', 'b', 'a']);
  });

  it('rejects when the backend responds with an error', async () => {
    await setup([]);

    const promise = service.create(createInput());
    httpMock.expectOne(BASE_URL).flush({ error: 'ConflictError' }, { status: 409, statusText: 'Conflict' });

    await expect(promise).rejects.toBeTruthy();
  });
});

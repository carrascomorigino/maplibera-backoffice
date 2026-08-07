import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { TranslationSuggestionService } from './translation-suggestion.service';

describe('TranslationSuggestionService', () => {
  let service: TranslationSuggestionService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(TranslationSuggestionService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('POSTs the source/target languages and a nested fields object to /api/translate', async () => {
    const promise = service.suggest(
      { language: 'en', fields: { title: 'Title', description: 'Description' } },
      'es',
    );

    const req = httpMock.expectOne('/api/translate');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      sourceLanguage: 'en',
      targetLanguage: 'es',
      fields: { title: 'Title', description: 'Description' },
    });
    req.flush({ title: 'Título', description: 'Descripción' });

    await expect(promise).resolves.toEqual({ title: 'Título', description: 'Descripción' });
  });

  it('rejects when the backend responds with an error', async () => {
    const promise = service.suggest(
      { language: 'en', fields: { title: 'Title', description: 'Description' } },
      'es',
    );

    const req = httpMock.expectOne('/api/translate');
    req.flush({ error: 'translation_failed' }, { status: 502, statusText: 'Bad Gateway' });

    await expect(promise).rejects.toBeTruthy();
  });
});

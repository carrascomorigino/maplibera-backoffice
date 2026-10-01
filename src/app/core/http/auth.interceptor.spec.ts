import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router, provideRouter } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { firstValueFrom } from 'rxjs';
import { authInterceptor, parseRetryAfter } from './auth.interceptor';
import { API_BASE_URL } from './api-base-url.token';
import { AuthService } from '../auth/auth.service';
import { FIREBASE_AUTH_CLIENT } from '../auth/firebase-auth-client';
import { FakeFirebaseAuthClient, makeAuthUser } from '../auth/testing/fake-firebase-auth-client';

const BASE_URL = '/backend';

/**
 * The interceptor resolves the id token before forwarding, so the request only reaches the testing
 * backend on a later microtask. Every spec has to let the queue drain first.
 */
function tick(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

describe('authInterceptor', () => {
  let client: FakeFirebaseAuthClient;
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let router: Router;
  let snackBar: { open: ReturnType<typeof vi.fn> };

  function setup(): void {
    client = new FakeFirebaseAuthClient();
    snackBar = { open: vi.fn() };
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: BASE_URL },
        { provide: FIREBASE_AUTH_CLIENT, useValue: client },
        { provide: MatSnackBar, useValue: snackBar },
      ],
    });
    TestBed.inject(AuthService);
    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    client.emit(makeAuthUser());
  }

  afterEach(() => httpMock.verify());

  it('attaches the id token to backend requests', async () => {
    setup();
    const promise = firstValueFrom(http.get(`${BASE_URL}/sections`));
    await tick();

    const req = httpMock.expectOne(`${BASE_URL}/sections`);
    expect(req.request.headers.get('Authorization')).toBe('Bearer id-token');
    req.flush([]);

    await promise;
  });

  it('leaves non-backend requests untouched', async () => {
    setup();
    const promise = firstValueFrom(http.post('/api/translate', {}));
    await tick();

    const req = httpMock.expectOne('/api/translate');
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({});

    await promise;
  });

  it('sends no Authorization header when there is no session', async () => {
    setup();
    client.token = null;
    const promise = firstValueFrom(http.get(`${BASE_URL}/news`));
    await tick();

    const req = httpMock.expectOne(`${BASE_URL}/news`);
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush([]);

    await promise;
  });

  it('refreshes the token and retries once on 401', async () => {
    setup();
    const promise = firstValueFrom(http.get(`${BASE_URL}/sections`));
    await tick();

    httpMock
      .expectOne(`${BASE_URL}/sections`)
      .flush({}, { status: 401, statusText: 'Unauthorized' });
    await tick();

    const retry = httpMock.expectOne(`${BASE_URL}/sections`);
    expect(retry.request.headers.get('Authorization')).toBe('Bearer refreshed-id-token');
    retry.flush([{ id: 's1' }]);

    await expect(promise).resolves.toEqual([{ id: 's1' }]);
    expect(client.getIdToken).toHaveBeenCalledWith(true);
    expect(client.signOut).not.toHaveBeenCalled();
  });

  it('signs out and redirects to /login when the retry also fails', async () => {
    setup();
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    const promise = firstValueFrom(http.get(`${BASE_URL}/sections`));
    await tick();

    httpMock
      .expectOne(`${BASE_URL}/sections`)
      .flush({}, { status: 401, statusText: 'Unauthorized' });
    await tick();

    httpMock
      .expectOne(`${BASE_URL}/sections`)
      .flush({}, { status: 401, statusText: 'Unauthorized' });

    await expect(promise).rejects.toMatchObject({ status: 401 });
    await tick();

    expect(client.signOut).toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith(['/login']);
  });

  it('does not retry a 403 and tells the user the account is not an admin', async () => {
    setup();
    const promise = firstValueFrom(http.post(`${BASE_URL}/sections`, {}));
    await tick();

    httpMock
      .expectOne(`${BASE_URL}/sections`)
      .flush({}, { status: 403, statusText: 'Forbidden' });

    await expect(promise).rejects.toMatchObject({ status: 403 });
    await tick();

    httpMock.expectNone(`${BASE_URL}/sections`);
    expect(client.getIdToken).not.toHaveBeenCalledWith(true);
    expect(client.signOut).not.toHaveBeenCalled();
    expect(snackBar.open).toHaveBeenCalledWith(
      'This account is not an admin.',
      expect.any(String),
      expect.anything(),
    );
  });

  it('tells the user how long to wait on 429, from Retry-After', async () => {
    setup();
    const promise = firstValueFrom(http.get(`${BASE_URL}/news`));
    await tick();

    httpMock.expectOne(`${BASE_URL}/news`).flush(
      {},
      { status: 429, statusText: 'Too Many Requests', headers: { 'Retry-After': '42' } },
    );

    await expect(promise).rejects.toMatchObject({ status: 429 });
    expect(snackBar.open).toHaveBeenCalledWith(
      expect.stringContaining('42'),
      expect.any(String),
      expect.anything(),
    );
  });

  it('falls back to a generic wait message when Retry-After is missing', async () => {
    setup();
    const promise = firstValueFrom(http.get(`${BASE_URL}/news`));
    await tick();

    httpMock
      .expectOne(`${BASE_URL}/news`)
      .flush({}, { status: 429, statusText: 'Too Many Requests' });

    await expect(promise).rejects.toMatchObject({ status: 429 });
    expect(snackBar.open).toHaveBeenCalledWith(
      'Too many requests. Wait a moment and try again.',
      expect.any(String),
      expect.anything(),
    );
  });

  it('does not retry other errors', async () => {
    setup();
    const promise = firstValueFrom(http.get(`${BASE_URL}/sections`));
    await tick();

    httpMock
      .expectOne(`${BASE_URL}/sections`)
      .flush({}, { status: 500, statusText: 'Server Error' });

    await expect(promise).rejects.toMatchObject({ status: 500 });
    expect(client.getIdToken).not.toHaveBeenCalledWith(true);
    expect(snackBar.open).not.toHaveBeenCalled();
  });
});

describe('parseRetryAfter', () => {
  it('reads delta-seconds', () => expect(parseRetryAfter('30')).toBe(30));

  it('reads an HTTP date relative to now', () => {
    const now = Date.parse('Wed, 01 Oct 2026 10:00:00 GMT');
    expect(parseRetryAfter('Wed, 01 Oct 2026 10:01:00 GMT', now)).toBe(60);
  });

  it('returns null when missing or unreadable', () => {
    expect(parseRetryAfter(null)).toBeNull();
    expect(parseRetryAfter('soon')).toBeNull();
  });
});

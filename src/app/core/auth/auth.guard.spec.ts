import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { provideRouter } from '@angular/router';
import { authGuard, guestGuard } from './auth.guard';
import { FIREBASE_AUTH_CLIENT } from './firebase-auth-client';
import { FakeFirebaseAuthClient, makeAuthUser } from './testing/fake-firebase-auth-client';
import { AuthService } from './auth.service';

describe('auth guards', () => {
  let client: FakeFirebaseAuthClient;
  let router: Router;

  function setup(): void {
    client = new FakeFirebaseAuthClient();
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: FIREBASE_AUTH_CLIENT, useValue: client }],
    });
    TestBed.inject(AuthService);
    router = TestBed.inject(Router);
  }

  function run(guard: typeof authGuard, url: string): Promise<boolean | UrlTree> {
    const state = { url } as RouterStateSnapshot;
    const route = {} as ActivatedRouteSnapshot;
    return Promise.resolve(
      TestBed.runInInjectionContext(() => guard(route, state)) as Promise<boolean | UrlTree>,
    );
  }

  describe('authGuard', () => {
    it('lets an authenticated user through', async () => {
      setup();
      client.emit(makeAuthUser());

      await expect(run(authGuard, '/news')).resolves.toBe(true);
    });

    it('redirects to /login carrying the attempted url', async () => {
      setup();
      client.emit(null);

      const result = await run(authGuard, '/news');

      expect(router.serializeUrl(result as UrlTree)).toBe('/login?redirectTo=%2Fnews');
    });

    it('waits for the initial session state before deciding', async () => {
      setup();
      let settled = false;
      const pending = run(authGuard, '/news').then((result) => {
        settled = true;
        return result;
      });

      await Promise.resolve();
      expect(settled).toBe(false);

      client.emit(makeAuthUser());

      await expect(pending).resolves.toBe(true);
    });
  });

  describe('guestGuard', () => {
    it('lets an anonymous visitor reach the login page', async () => {
      setup();
      client.emit(null);

      await expect(run(guestGuard, '/login')).resolves.toBe(true);
    });

    it('sends an already-authenticated user to the dashboard', async () => {
      setup();
      client.emit(makeAuthUser());

      const result = await run(guestGuard, '/login');

      expect(router.serializeUrl(result as UrlTree)).toBe('/');
    });
  });
});

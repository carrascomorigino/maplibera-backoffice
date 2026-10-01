import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

/**
 * Gates every data route. Awaiting `whenReady()` matters on a hard refresh: Firebase restores the
 * session asynchronously, and without the wait an authenticated user would be bounced to /login.
 * It also guarantees the feature services are only constructed once a token exists, so their
 * constructor `refresh()` never fires unauthenticated.
 */
export const authGuard: CanActivateFn = async (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  await auth.whenReady();

  return (
    auth.isAuthenticated() ||
    router.createUrlTree(['/login'], { queryParams: { redirectTo: state.url } })
  );
};

/** Keeps an already-signed-in user off the login page. */
export const guestGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  await auth.whenReady();

  return auth.isAuthenticated() ? router.createUrlTree(['/']) : true;
};

import { inject } from '@angular/core';
import { HttpErrorResponse, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Observable, catchError, from, switchMap, throwError } from 'rxjs';
import { API_BASE_URL } from './api-base-url.token';
import { AuthService } from '../auth/auth.service';
import { LanguageService } from '../i18n/language.service';

const SNACK_BAR_DURATION_MS = 8000;

function withToken<T>(req: HttpRequest<T>, token: string | null): HttpRequest<T> {
  return token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;
}

function hasStatus(error: unknown, status: number): error is HttpErrorResponse {
  return error instanceof HttpErrorResponse && error.status === status;
}

/**
 * `Retry-After` is either delta-seconds or an HTTP date. Returns null when it is missing or
 * unreadable — note the browser only exposes it cross-origin if the backend lists it in
 * `Access-Control-Expose-Headers`.
 */
export function parseRetryAfter(value: string | null, now = Date.now()): number | null {
  if (!value) {
    return null;
  }
  const seconds = Number(value);
  if (Number.isFinite(seconds)) {
    return Math.max(0, Math.ceil(seconds));
  }
  const date = Date.parse(value);
  return Number.isNaN(date) ? null : Math.max(0, Math.ceil((date - now) / 1000));
}

/**
 * Adds the Firebase ID token to every backend call and handles the auth-related failures:
 * - 401: retried exactly once with a force-refreshed token (ID tokens expire after an hour). If the
 *   retry fails too, the session is dropped and the user goes back to /login.
 * - 403: the token is valid but lacks the `role: 'admin'` claim. A refresh cannot fix that, so it
 *   is never retried; the user is told instead.
 * - 429: the rate limiter tripped. The user is told how long to wait.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const baseUrl = inject(API_BASE_URL);
  const auth = inject(AuthService);
  const router = inject(Router);
  const snackBar = inject(MatSnackBar);
  const language = inject(LanguageService);

  if (!req.url.startsWith(baseUrl)) {
    return next(req);
  }

  const notify = (message: string): void => {
    snackBar.open(message, language.t().apiErrors.dismissButton, {
      duration: SNACK_BAR_DURATION_MS,
      politeness: 'assertive',
    });
  };

  const send = (
    forceRefresh: boolean,
  ): Observable<ReturnType<typeof next> extends Observable<infer T> ? T : never> =>
    from(auth.getIdToken(forceRefresh)).pipe(switchMap((token) => next(withToken(req, token))));

  const handleNonRetryable = (error: unknown): Observable<never> => {
    if (hasStatus(error, 403)) {
      notify(language.t().apiErrors.notAdmin);
    } else if (hasStatus(error, 429)) {
      notify(language.t().apiErrors.rateLimited(parseRetryAfter(error.headers.get('Retry-After'))));
    }
    return throwError(() => error);
  };

  return send(false).pipe(
    catchError((error: unknown) => {
      if (!hasStatus(error, 401)) {
        return handleNonRetryable(error);
      }

      return send(true).pipe(
        catchError((retryError: unknown) => {
          if (hasStatus(retryError, 401)) {
            void auth.signOut().finally(() => void router.navigate(['/login']));
            return throwError(() => retryError);
          }
          return handleNonRetryable(retryError);
        }),
      );
    }),
  );
};

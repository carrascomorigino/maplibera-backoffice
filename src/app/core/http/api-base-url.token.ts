import { InjectionToken } from '@angular/core';
import { environment } from '../../../environments/environment';

/**
 * Root of every backend URL. Relative (`/backend`) in development so the dev-server proxy handles
 * it; an absolute origin in production. Injected rather than imported directly so tests can
 * override it.
 */
export const API_BASE_URL = new InjectionToken<string>('API_BASE_URL', {
  providedIn: 'root',
  factory: () => environment.apiBaseUrl,
});

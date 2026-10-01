/** The subset of the Firebase user this app actually renders. */
export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
}

export type AuthStatus = 'loading' | 'authenticated' | 'anonymous';

/**
 * Identifies a message under `Translations['auth']['errors']`. Firebase error codes never reach the
 * UI: they are mapped to one of these keys so the copy stays translatable and stable.
 */
export type AuthErrorKey =
  'tooManyRequests' | 'network' | 'popupClosed' | 'unknown';

export class AuthError extends Error {
  constructor(readonly key: AuthErrorKey) {
    super(key);
    this.name = 'AuthError';
  }
}

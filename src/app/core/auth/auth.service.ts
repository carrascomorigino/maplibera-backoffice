import { Injectable, computed, inject, signal } from '@angular/core';
import { FIREBASE_AUTH_CLIENT } from './firebase-auth-client';
import { AuthError, AuthErrorKey, AuthStatus, AuthUser } from './models/auth-user.model';

/** Firebase error codes are an implementation detail; the UI only ever sees an `AuthErrorKey`. */
function toAuthError(error: unknown): AuthError {
  if (error instanceof AuthError) {
    return error;
  }

  const code =
    typeof error === 'object' && error !== null && 'code' in error
      ? String((error as { code: unknown }).code)
      : '';

  const key: AuthErrorKey = (() => {
    switch (code) {
      case 'auth/too-many-requests':
        return 'tooManyRequests';
      case 'auth/network-request-failed':
        return 'network';
      case 'auth/popup-closed-by-user':
      case 'auth/cancelled-popup-request':
        return 'popupClosed';
      default:
        return 'unknown';
    }
  })();

  return new AuthError(key);
}

/**
 * Owns the session state as signals, the same way each feature service owns its own data. Firebase
 * itself lives behind `FIREBASE_AUTH_CLIENT`; this class only holds state and normalises errors.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly client = inject(FIREBASE_AUTH_CLIENT);

  private readonly _user = signal<AuthUser | null>(null);
  private readonly _status = signal<AuthStatus>('loading');

  readonly user = this._user.asReadonly();
  readonly status = this._status.asReadonly();
  readonly isAuthenticated = computed(() => this._status() === 'authenticated');

  /**
   * Resolves once Firebase has reported whether a session exists. The guards await this so a
   * refresh never bounces an authenticated user to the login page.
   */
  private readonly ready: Promise<void>;

  constructor() {
    let markReady!: () => void;
    this.ready = new Promise<void>((resolve) => (markReady = resolve));

    this.client.onAuthStateChanged((user) => {
      this._user.set(user);
      this._status.set(user ? 'authenticated' : 'anonymous');
      markReady();
    });
  }

  whenReady(): Promise<void> {
    return this.ready;
  }

  async signInWithGoogle(): Promise<void> {
    try {
      await this.client.signInWithGoogle();
    } catch (error) {
      throw toAuthError(error);
    }
  }

  async signOut(): Promise<void> {
    await this.client.signOut();
  }

  getIdToken(forceRefresh = false): Promise<string | null> {
    return this.client.getIdToken(forceRefresh);
  }
}

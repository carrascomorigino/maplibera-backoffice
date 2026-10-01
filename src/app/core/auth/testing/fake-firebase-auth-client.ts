import { FirebaseAuthClient } from '../firebase-auth-client';
import { AuthUser } from '../models/auth-user.model';

export function makeAuthUser(overrides: Partial<AuthUser> = {}): AuthUser {
  return { uid: 'uid-1', email: 'admin@maplibera.org', displayName: 'Admin', ...overrides };
}

/**
 * Test double for `FirebaseAuthClient`. The session listener is held rather than fired immediately
 * so specs can assert on the `'loading'` state before calling `emit()`.
 */
export class FakeFirebaseAuthClient implements FirebaseAuthClient {
  private listener: ((user: AuthUser | null) => void) | null = null;

  token: string | null = 'id-token';
  refreshedToken: string | null = 'refreshed-id-token';

  signInWithGoogle = vi.fn(async (): Promise<void> => {
    this.emit(makeAuthUser());
  });

  signOut = vi.fn(async (): Promise<void> => {
    this.emit(null);
  });

  getIdToken = vi.fn(async (forceRefresh: boolean): Promise<string | null> =>
    forceRefresh ? this.refreshedToken : this.token,
  );

  onAuthStateChanged(listener: (user: AuthUser | null) => void): void {
    this.listener = listener;
  }

  /** Simulates Firebase reporting a session change. */
  emit(user: AuthUser | null): void {
    this.listener?.(user);
  }
}

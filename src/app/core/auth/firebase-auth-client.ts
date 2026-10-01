import { InjectionToken, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { AuthUser } from './models/auth-user.model';
import { createFirebaseAuthClient } from './firebase-auth-client.browser';

/**
 * The narrow slice of Firebase Auth this app uses. Keeping it behind an interface means the SDK is
 * touched in exactly one place, the server build never calls into it, and specs can supply a plain
 * fake instead of mocking the `firebase/auth` module.
 */
export interface FirebaseAuthClient {
  /** Registers the session listener. Must invoke `listener` once with the initial state. */
  onAuthStateChanged(listener: (user: AuthUser | null) => void): void;
  signInWithGoogle(): Promise<void>;
  signOut(): Promise<void>;
  getIdToken(forceRefresh: boolean): Promise<string | null>;
}

/** Used during server-side rendering, where Firebase Auth has no session to report. */
const inertClient: FirebaseAuthClient = {
  onAuthStateChanged: (listener) => listener(null),
  signInWithGoogle: async () => undefined,
  signOut: async () => undefined,
  getIdToken: async () => null,
};

export const FIREBASE_AUTH_CLIENT = new InjectionToken<FirebaseAuthClient>('FIREBASE_AUTH_CLIENT', {
  providedIn: 'root',
  factory: () =>
    isPlatformBrowser(inject(PLATFORM_ID)) ? createFirebaseAuthClient() : inertClient,
});

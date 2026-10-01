import { FirebaseApp, getApp, getApps, initializeApp } from 'firebase/app';
import {
  GoogleAuthProvider,
  User,
  getAuth,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import { environment } from '../../../environments/environment';
import { AuthUser } from './models/auth-user.model';
import { FirebaseAuthClient } from './firebase-auth-client';

/** Reusing the already-initialised app keeps dev-server hot reloads from re-registering it. */
function firebaseApp(): FirebaseApp {
  return getApps().length ? getApp() : initializeApp(environment.firebase);
}

function toAuthUser(user: User): AuthUser {
  return { uid: user.uid, email: user.email, displayName: user.displayName };
}

/**
 * The one place the Firebase Auth SDK is used. Everything above it (AuthService, the guards, the
 * interceptor) talks to the `FirebaseAuthClient` interface instead.
 */
export function createFirebaseAuthClient(): FirebaseAuthClient {
  const auth = getAuth(firebaseApp());

  return {
    onAuthStateChanged: (listener) =>
      onAuthStateChanged(auth, (user) => listener(user ? toAuthUser(user) : null)),
    signInWithGoogle: async () => {
      await signInWithPopup(auth, new GoogleAuthProvider());
    },
    signOut: () => signOut(auth),
    // `getIdToken()` returns the cached token and only hits the network when it is about to expire
    // or `forceRefresh` is set (the interceptor's single retry after a 401).
    getIdToken: async (forceRefresh) => (await auth.currentUser?.getIdToken(forceRefresh)) ?? null,
  };
}

import { TestBed } from '@angular/core/testing';
import { AuthService } from './auth.service';
import { FIREBASE_AUTH_CLIENT } from './firebase-auth-client';
import { AuthError } from './models/auth-user.model';
import { FakeFirebaseAuthClient, makeAuthUser } from './testing/fake-firebase-auth-client';

describe('AuthService', () => {
  let client: FakeFirebaseAuthClient;

  function setup(): AuthService {
    client = new FakeFirebaseAuthClient();
    TestBed.configureTestingModule({
      providers: [{ provide: FIREBASE_AUTH_CLIENT, useValue: client }],
    });
    return TestBed.inject(AuthService);
  }

  describe('session state', () => {
    it('starts loading until Firebase reports the initial state', () => {
      const service = setup();

      expect(service.status()).toBe('loading');
      expect(service.isAuthenticated()).toBe(false);
      expect(service.user()).toBeNull();
    });

    it('becomes authenticated and exposes the user once a session is reported', () => {
      const service = setup();

      client.emit(makeAuthUser({ email: 'gino@maplibera.org' }));

      expect(service.status()).toBe('authenticated');
      expect(service.isAuthenticated()).toBe(true);
      expect(service.user()?.email).toBe('gino@maplibera.org');
    });

    it('becomes anonymous when Firebase reports no session', () => {
      const service = setup();

      client.emit(null);

      expect(service.status()).toBe('anonymous');
      expect(service.isAuthenticated()).toBe(false);
      expect(service.user()).toBeNull();
    });

    it('clears the user on sign out', async () => {
      const service = setup();
      client.emit(makeAuthUser());

      await service.signOut();

      expect(service.status()).toBe('anonymous');
      expect(service.user()).toBeNull();
    });
  });

  describe('whenReady', () => {
    it('resolves only after the first session state arrives', async () => {
      const service = setup();
      let resolved = false;
      void service.whenReady().then(() => (resolved = true));

      await Promise.resolve();
      expect(resolved).toBe(false);

      client.emit(null);
      await service.whenReady();

      expect(resolved).toBe(true);
    });

    it('stays resolved for later callers', async () => {
      const service = setup();
      client.emit(makeAuthUser());

      await expect(service.whenReady()).resolves.toBeUndefined();
    });
  });

  describe('sign in', () => {
    it('delegates Google sign in to the client', async () => {
      const service = setup();

      await service.signInWithGoogle();

      expect(client.signInWithGoogle).toHaveBeenCalled();
      expect(service.isAuthenticated()).toBe(true);
    });
  });

  describe('error mapping', () => {
    it.each([
      ['auth/too-many-requests', 'tooManyRequests'],
      ['auth/network-request-failed', 'network'],
      ['auth/popup-closed-by-user', 'popupClosed'],
      ['auth/cancelled-popup-request', 'popupClosed'],
      ['auth/internal-error', 'unknown'],
    ])('maps %s to the %s message key', async (code, key) => {
      const service = setup();
      client.signInWithGoogle.mockRejectedValueOnce({ code });

      await expect(service.signInWithGoogle()).rejects.toMatchObject({ key });
    });

    it('maps a non-Firebase failure to the unknown key', async () => {
      const service = setup();
      client.signInWithGoogle.mockRejectedValueOnce(new Error('boom'));

      await expect(service.signInWithGoogle()).rejects.toBeInstanceOf(AuthError);
    });
  });

  describe('getIdToken', () => {
    it('returns the current token by default', async () => {
      const service = setup();
      client.emit(makeAuthUser());

      await expect(service.getIdToken()).resolves.toBe('id-token');
      expect(client.getIdToken).toHaveBeenCalledWith(false);
    });

    it('forces a refresh when asked', async () => {
      const service = setup();
      client.emit(makeAuthUser());

      await expect(service.getIdToken(true)).resolves.toBe('refreshed-id-token');
      expect(client.getIdToken).toHaveBeenCalledWith(true);
    });
  });
});

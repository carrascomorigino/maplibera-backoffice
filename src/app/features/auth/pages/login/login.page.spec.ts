import { TestBed } from '@angular/core/testing';
import { ComponentFixture } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { LoginPage } from './login.page';
import { AuthService } from '../../../../core/auth/auth.service';
import { FIREBASE_AUTH_CLIENT } from '../../../../core/auth/firebase-auth-client';
import { AuthError } from '../../../../core/auth/models/auth-user.model';
import { FakeFirebaseAuthClient } from '../../../../core/auth/testing/fake-firebase-auth-client';
import { LanguageService } from '../../../../core/i18n/language.service';

describe('LoginPage', () => {
  let client: FakeFirebaseAuthClient;
  let auth: AuthService;
  let router: Router;
  let language: LanguageService;

  function setup(queryParams: Record<string, string> = {}): ComponentFixture<LoginPage> {
    client = new FakeFirebaseAuthClient();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideNoopAnimations(),
        { provide: FIREBASE_AUTH_CLIENT, useValue: client },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParamMap: convertToParamMap(queryParams) } },
        },
      ],
    });
    auth = TestBed.inject(AuthService);
    router = TestBed.inject(Router);
    language = TestBed.inject(LanguageService);
    vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);

    const fixture = TestBed.createComponent(LoginPage);
    fixture.detectChanges();
    return fixture;
  }

  function el<T extends HTMLElement>(fixture: ComponentFixture<LoginPage>, testId: string): T {
    return fixture.nativeElement.querySelector(`[data-testid="${testId}"]`) as T;
  }

  it('shows only the Google sign-in button', () => {
    const fixture = setup();

    expect(el(fixture, 'login-google')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('input')).toBeNull();
  });

  it('signs in with Google', async () => {
    const fixture = setup();

    el<HTMLButtonElement>(fixture, 'login-google').click();
    await fixture.whenStable();

    expect(client.signInWithGoogle).toHaveBeenCalled();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/');
  });

  it('returns to the route the guard interrupted', async () => {
    const fixture = setup({ redirectTo: '/news' });

    el<HTMLButtonElement>(fixture, 'login-google').click();
    await fixture.whenStable();

    expect(router.navigateByUrl).toHaveBeenCalledWith('/news');
    expect(auth.isAuthenticated()).toBe(true);
  });

  it('renders the translated message for a failed sign in', async () => {
    const fixture = setup();
    client.signInWithGoogle.mockRejectedValueOnce(new AuthError('popupClosed'));

    el<HTMLButtonElement>(fixture, 'login-google').click();
    await fixture.whenStable();
    fixture.detectChanges();

    const error = el(fixture, 'login-error');
    expect(error.textContent).toContain(language.t().auth.errors.popupClosed);
    expect(error.getAttribute('role')).toBe('alert');
    expect(router.navigateByUrl).not.toHaveBeenCalled();
  });

  it('re-enables the button after a failure', async () => {
    const fixture = setup();
    client.signInWithGoogle.mockRejectedValueOnce(new AuthError('popupClosed'));

    el<HTMLButtonElement>(fixture, 'login-google').click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(el<HTMLButtonElement>(fixture, 'login-google').disabled).toBe(false);
  });
});

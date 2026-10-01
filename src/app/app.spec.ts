import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { App } from './app';
import { AuthService } from './core/auth/auth.service';
import { FIREBASE_AUTH_CLIENT } from './core/auth/firebase-auth-client';
import {
  FakeFirebaseAuthClient,
  makeAuthUser,
} from './core/auth/testing/fake-firebase-auth-client';
import { LanguageService } from './core/i18n/language.service';

describe('App', () => {
  let language: LanguageService;
  let client: FakeFirebaseAuthClient;

  beforeEach(async () => {
    localStorage.clear();
    client = new FakeFirebaseAuthClient();
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([]), { provide: FIREBASE_AUTH_CLIENT, useValue: client }],
    }).compileComponents();
    TestBed.inject(AuthService);
    language = TestBed.inject(LanguageService);
  });

  /** The nav only exists for a signed-in user, so most specs need a session first. */
  async function renderSignedIn(): Promise<ComponentFixture<App>> {
    client.emit(makeAuthUser({ email: 'gino@maplibera.org' }));
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture;
  }

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render a nav link to the dashboard as the first nav item', async () => {
    const fixture = await renderSignedIn();
    const compiled = fixture.nativeElement as HTMLElement;
    const link = compiled.querySelector('a');
    expect(link?.getAttribute('href')).toBe('/');
    expect(link?.textContent?.trim()).toBe(language.t().nav.dashboardLink);
  });

  it('should render a nav link to the guide sections module', async () => {
    const fixture = await renderSignedIn();
    const compiled = fixture.nativeElement as HTMLElement;
    const links = compiled.querySelectorAll('a');
    const sectionsLink = Array.from(links).find(
      (link) => link.getAttribute('href') === '/guide/sections',
    );
    expect(sectionsLink?.textContent?.trim()).toBe(language.t().nav.sectionsLink);
  });

  it('should render a nav link to the resources module', async () => {
    const fixture = await renderSignedIn();
    const compiled = fixture.nativeElement as HTMLElement;
    const links = compiled.querySelectorAll('a');
    const resourcesLink = Array.from(links).find(
      (link) => link.getAttribute('href') === '/resources',
    );
    expect(resourcesLink?.textContent?.trim()).toBe(language.t().nav.resourcesLink);
  });

  it('should render the app title translated', async () => {
    const fixture = await renderSignedIn();
    const compiled = fixture.nativeElement as HTMLElement;
    const title = compiled.querySelector('[data-testid="nav-title"]');
    expect(title?.textContent?.trim()).toBe(language.t().nav.appTitle);
  });

  describe('signed out', () => {
    it('hides the module links', async () => {
      client.emit(null);
      const fixture = TestBed.createComponent(App);
      await fixture.whenStable();
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('a[href="/guide/sections"]')).toBeNull();
      expect(compiled.querySelector('[data-testid="sign-out"]')).toBeNull();
    });
  });

  describe('signed in', () => {
    it('shows who is signed in', async () => {
      const fixture = await renderSignedIn();

      const chip = fixture.nativeElement.querySelector(
        '[data-testid="signed-in-as"]',
      ) as HTMLElement;
      expect(chip.textContent?.trim()).toBe(language.t().auth.signedInAs('gino@maplibera.org'));
    });

    it('signs out and returns to the login page', async () => {
      const fixture = await renderSignedIn();
      const router = TestBed.inject(Router);
      const navigate = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);

      (
        fixture.nativeElement.querySelector('[data-testid="sign-out"]') as HTMLButtonElement
      ).click();
      await fixture.whenStable();
      fixture.detectChanges();

      expect(client.signOut).toHaveBeenCalled();
      expect(navigate).toHaveBeenCalledWith('/login');
      expect(fixture.nativeElement.querySelector('[data-testid="sign-out"]')).toBeNull();
    });
  });
});

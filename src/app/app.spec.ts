import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';
import { LanguageService } from './core/i18n/language.service';

describe('App', () => {
  let language: LanguageService;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([])],
    }).compileComponents();
    language = TestBed.inject(LanguageService);
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render a nav link to the guide sections module', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const link = compiled.querySelector('a');
    expect(link?.getAttribute('href')).toBe('/guide/sections');
    expect(link?.textContent?.trim()).toBe(language.t().nav.sectionsLink);
  });

  it('should render a nav link to the resources module', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const links = compiled.querySelectorAll('a');
    const resourcesLink = Array.from(links).find((link) => link.getAttribute('href') === '/resources');
    expect(resourcesLink?.textContent?.trim()).toBe(language.t().nav.resourcesLink);
  });

  it('should render the app title translated', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const title = compiled.querySelector('[data-testid="nav-title"]');
    expect(title?.textContent?.trim()).toBe(language.t().nav.appTitle);
  });
});

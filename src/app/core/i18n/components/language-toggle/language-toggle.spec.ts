import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { MatButtonToggleGroup } from '@angular/material/button-toggle';
import { LanguageToggle } from './language-toggle';
import { LanguageService } from '../../language.service';

describe('LanguageToggle', () => {
  let service: LanguageService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    service = TestBed.inject(LanguageService);
  });

  function createFixture() {
    const fixture = TestBed.createComponent(LanguageToggle);
    fixture.detectChanges();
    return fixture;
  }

  function options(fixture: ReturnType<typeof createFixture>) {
    return {
      es: fixture.nativeElement.querySelector('[data-testid="language-toggle-es"]') as HTMLElement,
      en: fixture.nativeElement.querySelector('[data-testid="language-toggle-en"]') as HTMLElement,
    };
  }

  function groupValue(fixture: ReturnType<typeof createFixture>) {
    return fixture.debugElement.query(By.directive(MatButtonToggleGroup)).injector.get(
      MatButtonToggleGroup,
    ).value;
  }

  it('renders both ES and EN options', () => {
    const fixture = createFixture();

    const { es, en } = options(fixture);
    expect(es).not.toBeNull();
    expect(en).not.toBeNull();
  });

  it('reflects the current language as the active option', () => {
    service.setLanguage('es');
    const fixture = createFixture();

    expect(groupValue(fixture)).toBe('es');
  });

  it('calls setLanguage with the clicked option', () => {
    service.setLanguage('en');
    const fixture = createFixture();

    const button = options(fixture).es.querySelector('button') as HTMLButtonElement;
    button.click();
    fixture.detectChanges();

    expect(service.language()).toBe('es');
  });
});

import { TestBed } from '@angular/core/testing';
import { LanguageTags } from './language-tags';
import { ContentLanguage } from '../../../features/guide/models/content-language.model';

describe('LanguageTags', () => {
  function createFixture(inputs: {
    languages?: readonly ContentLanguage[];
    translatedLanguages: readonly ContentLanguage[];
    staleLanguages?: Partial<Record<ContentLanguage, ContentLanguage>>;
    selectedLanguage: ContentLanguage;
  }) {
    localStorage.clear();
    TestBed.configureTestingModule({});
    const fixture = TestBed.createComponent(LanguageTags);
    fixture.componentRef.setInput('languages', inputs.languages ?? ['es', 'en', 'fr', 'pt']);
    fixture.componentRef.setInput('translatedLanguages', inputs.translatedLanguages);
    fixture.componentRef.setInput('staleLanguages', inputs.staleLanguages ?? {});
    fixture.componentRef.setInput('selectedLanguage', inputs.selectedLanguage);
    fixture.detectChanges();
    return fixture;
  }

  function tag(fixture: ReturnType<typeof createFixture>, lang: ContentLanguage) {
    return fixture.nativeElement.querySelector(`[data-testid="language-tag-${lang}"]`) as HTMLElement;
  }

  function removeButton(fixture: ReturnType<typeof createFixture>, lang: ContentLanguage) {
    return fixture.nativeElement.querySelector(
      `[data-testid="language-tag-remove-${lang}"]`,
    ) as HTMLButtonElement | null;
  }

  it('renders an untranslated tag with no remove button for an untranslated language', () => {
    const fixture = createFixture({ translatedLanguages: ['en'], selectedLanguage: 'en' });

    const esTag = tag(fixture, 'es');
    expect(esTag.className).toContain('ink');
    expect(removeButton(fixture, 'es')).toBeNull();
  });

  it('renders a colored tag with a remove button for a translated language (when not the last one)', () => {
    const fixture = createFixture({ translatedLanguages: ['en', 'es'], selectedLanguage: 'en' });

    const esTag = tag(fixture, 'es');
    expect(esTag.className).not.toContain('ink');
    expect(removeButton(fixture, 'es')).not.toBeNull();
  });

  it('suppresses the remove button when it is the only translated language', () => {
    const fixture = createFixture({ translatedLanguages: ['en'], selectedLanguage: 'en' });

    expect(removeButton(fixture, 'en')).toBeNull();
  });

  it('marks a stale language with a warning and an aria-label', () => {
    const fixture = createFixture({
      translatedLanguages: ['en', 'es'],
      staleLanguages: { es: 'en' },
      selectedLanguage: 'en',
    });

    const esTag = tag(fixture, 'es');
    expect(esTag.textContent).toContain('⚠');
    expect(esTag.getAttribute('aria-label')).toBeTruthy();
  });

  it('marks the selected language tag distinctly', () => {
    const fixture = createFixture({ translatedLanguages: ['en', 'es'], selectedLanguage: 'es' });

    expect(tag(fixture, 'es').className).toContain('ring');
    expect(tag(fixture, 'en').className).not.toContain('ring');
  });

  it('emits translateRequested when clicking a gray (untranslated) tag', () => {
    const fixture = createFixture({ translatedLanguages: ['en'], selectedLanguage: 'en' });
    const spy = vi.fn();
    fixture.componentInstance.translateRequested.subscribe(spy);

    tag(fixture, 'es').click();

    expect(spy).toHaveBeenCalledWith('es');
  });

  it('emits languageSelected when clicking a translated tag body', () => {
    const fixture = createFixture({ translatedLanguages: ['en', 'es'], selectedLanguage: 'en' });
    const spy = vi.fn();
    fixture.componentInstance.languageSelected.subscribe(spy);

    tag(fixture, 'es').click();

    expect(spy).toHaveBeenCalledWith('es');
  });

  it('emits languageRemoved when clicking the × and does not also emit languageSelected', () => {
    const fixture = createFixture({ translatedLanguages: ['en', 'es'], selectedLanguage: 'en' });
    const removedSpy = vi.fn();
    const selectedSpy = vi.fn();
    fixture.componentInstance.languageRemoved.subscribe(removedSpy);
    fixture.componentInstance.languageSelected.subscribe(selectedSpy);

    removeButton(fixture, 'es')!.click();

    expect(removedSpy).toHaveBeenCalledWith('es');
    expect(selectedSpy).not.toHaveBeenCalled();
  });
});

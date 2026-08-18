import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of } from 'rxjs';
import { SectionListItem } from './section-list-item';
import { SectionService } from '../../services/section.service';
import { LanguageService } from '../../../../core/i18n/language.service';
import { Question, Section } from '../../models/section.model';
import { FakeSectionService, makeSection } from '../../testing/fake-section-service';

describe('SectionListItem', () => {
  let service: FakeSectionService;
  let language: LanguageService;
  let snackBarOpen: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    service = new FakeSectionService();
    snackBarOpen = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        { provide: SectionService, useValue: service },
        { provide: MatSnackBar, useValue: { open: snackBarOpen } },
      ],
    });
    language = TestBed.inject(LanguageService);
  });

  function createFixture(section: Section) {
    const fixture = TestBed.createComponent(SectionListItem);
    fixture.componentRef.setInput('section', section);
    fixture.detectChanges();
    return fixture;
  }

  function languageTag(fixture: ReturnType<typeof createFixture>, lang: string) {
    return fixture.nativeElement.querySelector(`[data-testid="language-tag-${lang}"]`) as HTMLElement;
  }

  function twoLanguageSection(overrides: Partial<Section> = {}): Section {
    return makeSection({
      slug: 'multi',
      translations: { en: { title: 'Getting started', description: 'Intro' } },
      ...overrides,
    });
  }

  describe('initial language', () => {
    it("defaults to the app's UI language when the section has it translated", () => {
      language.setLanguage('en');
      const section = twoLanguageSection({
        translations: {
          en: { title: 'Getting started', description: 'Intro' },
          es: { title: 'Empezando', description: 'Intro es' },
        },
      });

      const fixture = createFixture(section);

      expect(fixture.componentInstance.selectedLanguage()).toBe('en');
    });

    it("falls back to the section's first available language otherwise", () => {
      language.setLanguage('en');
      const section = makeSection({
        slug: 'fr-only',
        translations: { fr: { title: 'Pour commencer', description: 'Intro' } },
      });

      const fixture = createFixture(section);

      expect(fixture.componentInstance.selectedLanguage()).toBe('fr');
    });
  });

  describe('language selection', () => {
    it('switches the displayed language without emitting when already translated and up to date', () => {
      language.setLanguage('en');
      const section = twoLanguageSection({
        translations: {
          en: { title: 'Getting started', description: 'Intro' },
          es: { title: 'Empezando', description: 'Intro es' },
        },
      });
      const fixture = createFixture(section);
      const translateRequested = vi.fn();
      const editRequested = vi.fn();
      fixture.componentInstance.translateRequested.subscribe(translateRequested);
      fixture.componentInstance.editRequested.subscribe(editRequested);

      fixture.componentInstance['onLanguageSelected']('es');
      fixture.detectChanges();

      expect(fixture.componentInstance.selectedLanguage()).toBe('es');
      expect(translateRequested).not.toHaveBeenCalled();
      expect(editRequested).not.toHaveBeenCalled();
    });

    it('switches the display and emits editRequested with the stale source when selecting a language flagged as needing an update', () => {
      language.setLanguage('en');
      const section = twoLanguageSection({
        translations: {
          en: { title: 'Getting started v2', description: 'Intro' },
          es: { title: 'Empezando', description: 'Intro es' },
        },
        staleLanguages: { es: 'en' },
      });
      const fixture = createFixture(section);
      const translateRequested = vi.fn();
      const editRequested = vi.fn();
      fixture.componentInstance.translateRequested.subscribe(translateRequested);
      fixture.componentInstance.editRequested.subscribe(editRequested);

      fixture.componentInstance['onLanguageSelected']('es');
      fixture.detectChanges();

      expect(fixture.componentInstance.selectedLanguage()).toBe('es');
      expect(translateRequested).not.toHaveBeenCalled();
      expect(editRequested).toHaveBeenCalledWith({
        section,
        targetLanguage: 'es',
        staleSourceLanguage: 'en',
      });
    });

    it('emits translateRequested with the correct source/target when switching to an untranslated language', () => {
      language.setLanguage('en');
      const section = twoLanguageSection();
      const fixture = createFixture(section);
      const translateRequested = vi.fn();
      fixture.componentInstance.translateRequested.subscribe(translateRequested);

      fixture.componentInstance['onTranslateRequested']('fr');
      fixture.detectChanges();

      expect(translateRequested).toHaveBeenCalledWith({
        section,
        sourceLanguage: 'en',
        targetLanguage: 'fr',
      });
      expect(fixture.componentInstance.selectedLanguage()).toBe('fr');
    });
  });

  describe('resetRequest', () => {
    it('reverts selectedLanguage when the reset targets this row', () => {
      language.setLanguage('en');
      const section = twoLanguageSection();
      const fixture = createFixture(section);
      fixture.componentInstance['onTranslateRequested']('fr');
      fixture.detectChanges();
      expect(fixture.componentInstance.selectedLanguage()).toBe('fr');

      fixture.componentRef.setInput('resetRequest', { slug: section.slug, language: 'en' });
      fixture.detectChanges();

      expect(fixture.componentInstance.selectedLanguage()).toBe('en');
    });

    it('ignores a reset targeting a different slug', () => {
      language.setLanguage('en');
      const section = twoLanguageSection();
      const fixture = createFixture(section);
      fixture.componentInstance['onTranslateRequested']('fr');
      fixture.detectChanges();

      fixture.componentRef.setInput('resetRequest', { slug: 'other-slug', language: 'en' });
      fixture.detectChanges();

      expect(fixture.componentInstance.selectedLanguage()).toBe('fr');
    });
  });

  describe('language tags', () => {
    it("reflects the section's translated languages as colored tags and the rest as untranslated", () => {
      language.setLanguage('en');
      const section = twoLanguageSection({
        translations: {
          en: { title: 'Getting started', description: 'Intro' },
          es: { title: 'Empezando', description: 'Intro es' },
        },
      });

      const fixture = createFixture(section);

      expect(languageTag(fixture, 'en').className).not.toContain('ink');
      expect(languageTag(fixture, 'es').className).not.toContain('ink');
      expect(languageTag(fixture, 'fr').className).toContain('ink');
    });

    it('renders after the title and question summary, not beside the title', () => {
      const section = makeSection({
        slug: 'yn',
        translations: {
          en: {
            title: 'YN',
            description: '',
            question: { text: 'Is this correct?', type: 'yes-no', yesNoCorrectAnswer: 'yes' },
          },
        },
      });

      const fixture = createFixture(section);

      const title = fixture.nativeElement.querySelector('[data-testid="section-title"]') as HTMLElement;
      const questionText = fixture.nativeElement.querySelector(
        '[data-testid="question-text"]',
      ) as HTMLElement;
      const tags = fixture.nativeElement.querySelector('app-language-tags') as HTMLElement;

      const position = title.compareDocumentPosition(tags);
      expect(position & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      const questionPosition = questionText.compareDocumentPosition(tags);
      expect(questionPosition & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });
  });

  describe('country availability indicator', () => {
    it('shows "worldwide" when availableCountries is not set', () => {
      language.setLanguage('en');
      const section = twoLanguageSection();

      const fixture = createFixture(section);

      expect(
        fixture.nativeElement
          .querySelector('[data-testid="country-availability-indicator"]')
          ?.textContent?.trim(),
      ).toBe(
        language
          .t()
          .guide.sectionsList.countryAvailabilityIndicator(
            language.t().guide.sectionsList.countryAvailabilityWorldwide,
          ),
      );
    });

    it('shows the localized, comma-separated country names when set', () => {
      language.setLanguage('en');
      const section = makeSection({
        slug: 'restricted',
        translations: { en: { title: 'Restricted', description: '' } },
        availableCountries: ['AR', 'BR'],
      });

      const fixture = createFixture(section);

      expect(
        fixture.nativeElement
          .querySelector('[data-testid="country-availability-indicator"]')
          ?.textContent?.trim(),
      ).toBe(language.t().guide.sectionsList.countryAvailabilityIndicator('Argentina, Brazil'));
    });
  });

  describe('edit', () => {
    it('emits editRequested for the current section and selected language', () => {
      language.setLanguage('en');
      const section = twoLanguageSection();
      const fixture = createFixture(section);
      const editRequested = vi.fn();
      fixture.componentInstance.editRequested.subscribe(editRequested);

      (fixture.nativeElement.querySelector('[data-testid="edit-button"]') as HTMLButtonElement).click();

      expect(editRequested).toHaveBeenCalledWith({
        section,
        targetLanguage: 'en',
        staleSourceLanguage: undefined,
      });
    });

    it('includes the stale source language when the currently selected (default) language needs an update', () => {
      language.setLanguage('en');
      const section = twoLanguageSection({
        translations: {
          en: { title: 'Getting started', description: 'Intro' },
          es: { title: 'Empezando v2', description: 'Intro es' },
        },
        staleLanguages: { en: 'es' },
      });
      const fixture = createFixture(section);
      const editRequested = vi.fn();
      fixture.componentInstance.editRequested.subscribe(editRequested);

      expect(fixture.componentInstance.selectedLanguage()).toBe('en');
      (fixture.nativeElement.querySelector('[data-testid="edit-button"]') as HTMLButtonElement).click();

      expect(editRequested).toHaveBeenCalledWith({
        section,
        targetLanguage: 'en',
        staleSourceLanguage: 'es',
      });
    });
  });

  describe('removing a language', () => {
    it('opens a confirm dialog and removes the translation via the service on confirm', async () => {
      language.setLanguage('en');
      const section = twoLanguageSection({
        translations: {
          en: { title: 'Getting started', description: 'Intro' },
          es: { title: 'Empezando', description: 'Intro es' },
        },
      });
      const fixture = createFixture(section);
      const dialog = TestBed.inject(MatDialog);
      const openSpy = vi.spyOn(dialog, 'open').mockReturnValue({
        afterClosed: () => of(true),
      } as ReturnType<MatDialog['open']>);

      fixture.componentInstance['onLanguageRemoved']('es');
      await Promise.resolve();

      expect(openSpy).toHaveBeenCalled();
      expect(service.removeTranslation).toHaveBeenCalledWith(section.id, 'es');
    });

    it('does not remove the translation when the dialog is cancelled', () => {
      language.setLanguage('en');
      const section = twoLanguageSection();
      const fixture = createFixture(section);
      const dialog = TestBed.inject(MatDialog);
      vi.spyOn(dialog, 'open').mockReturnValue({
        afterClosed: () => of(false),
      } as ReturnType<MatDialog['open']>);

      fixture.componentInstance['onLanguageRemoved']('es');

      expect(service.removeTranslation).not.toHaveBeenCalled();
    });

    it('shows an error notice when removing the translation fails', async () => {
      language.setLanguage('en');
      service.removeTranslation.mockRejectedValueOnce(new Error('network error'));
      const section = twoLanguageSection();
      const fixture = createFixture(section);
      const dialog = TestBed.inject(MatDialog);
      vi.spyOn(dialog, 'open').mockReturnValue({
        afterClosed: () => of(true),
      } as ReturnType<MatDialog['open']>);

      fixture.componentInstance['onLanguageRemoved']('es');
      await Promise.resolve();
      await Promise.resolve();

      expect(snackBarOpen).toHaveBeenCalled();
    });
  });

  describe('thumbnail and slug', () => {
    it('shows a placeholder icon and no image when the section has none', () => {
      const section = twoLanguageSection();

      const fixture = createFixture(section);

      expect(fixture.nativeElement.querySelector('[data-testid="thumbnail-placeholder"]')).not.toBeNull();
      expect(fixture.nativeElement.querySelector('img')).toBeNull();
    });

    it('shows the image and no placeholder when the section has one', () => {
      const section = makeSection({
        slug: 'with-image',
        imageUrl: 'https://example.com/image.png',
        translations: { en: { title: 'With image', description: '' } },
      });

      const fixture = createFixture(section);

      expect(fixture.nativeElement.querySelector('[data-testid="thumbnail-placeholder"]')).toBeNull();
      expect(fixture.nativeElement.querySelector('img')).not.toBeNull();
    });

    it('shows a drag handle', () => {
      const section = twoLanguageSection();

      const fixture = createFixture(section);

      expect(fixture.nativeElement.querySelector('[data-testid="drag-handle"]')).not.toBeNull();
    });

    it('shows the slug', () => {
      const section = twoLanguageSection();

      const fixture = createFixture(section);

      expect(
        fixture.nativeElement.querySelector('[data-testid="section-slug"]')?.textContent?.trim(),
      ).toBe('multi');
    });
  });

  describe('question summary', () => {
    it('shows nothing extra when the translation has no question', () => {
      const section = twoLanguageSection();

      const fixture = createFixture(section);

      expect(fixture.nativeElement.querySelector('[data-testid="question-type"]')).toBeNull();
    });

    it('shows the type, text, and only the correct answer for a yes/no question', () => {
      const section = makeSection({
        slug: 'yn',
        translations: {
          en: {
            title: 'YN',
            description: '',
            question: { text: 'Is this correct?', type: 'yes-no', yesNoCorrectAnswer: 'yes' },
          },
        },
      });

      const fixture = createFixture(section);

      expect(
        fixture.nativeElement.querySelector('[data-testid="question-type"]')?.textContent?.trim(),
      ).toBe(language.t().guide.sectionsList.questionTypeYesNo);
      expect(
        fixture.nativeElement.querySelector('[data-testid="question-text"]')?.textContent?.trim(),
      ).toBe('Is this correct?');
      const answers = Array.from(
        fixture.nativeElement.querySelectorAll('[data-testid="correct-answer"]'),
      ).map((el) => (el as HTMLElement).textContent?.trim());
      expect(answers).toEqual([language.t().guide.sectionsList.yesLabel]);
    });

    it('shows only the correct answers for a multiple choice question, including specials', () => {
      const section = makeSection({
        slug: 'mc',
        translations: {
          en: {
            title: 'MC',
            description: '',
            question: {
              text: 'Pick all that apply',
              type: 'multiple',
              answers: [
                { text: 'A', isCorrect: false },
                { text: 'B', isCorrect: false },
                { text: 'C', isCorrect: false },
              ],
              includeAllOfTheAbove: true,
              allOfTheAboveCorrect: true,
            },
          },
        },
      });

      const fixture = createFixture(section);

      const answers = Array.from(
        fixture.nativeElement.querySelectorAll('[data-testid="correct-answer"]'),
      ).map((el) => (el as HTMLElement).textContent?.trim());
      expect(answers).toEqual([language.t().guide.sectionsList.allOfTheAbove]);
    });
  });

  describe('correctAnswerLabels', () => {
    it('returns Yes or No for a yes/no question', () => {
      const section = twoLanguageSection();
      const fixture = createFixture(section);
      const component = fixture.componentInstance;

      expect(
        component['correctAnswerLabels']({ text: 'Q', type: 'yes-no', yesNoCorrectAnswer: 'yes' }),
      ).toEqual([language.t().guide.sectionsList.yesLabel]);
      expect(
        component['correctAnswerLabels']({ text: 'Q', type: 'yes-no', yesNoCorrectAnswer: 'no' }),
      ).toEqual([language.t().guide.sectionsList.noLabel]);
    });

    it('includes "All of the above" / "None of the above" when marked correct', () => {
      const section = twoLanguageSection();
      const fixture = createFixture(section);
      const component = fixture.componentInstance;
      const question: Question = {
        text: 'Q',
        type: 'single',
        answers: [{ text: 'A', isCorrect: false }],
        includeNoneOfTheAbove: true,
        noneOfTheAboveCorrect: true,
      };

      expect(component['correctAnswerLabels'](question)).toEqual([
        language.t().guide.sectionsList.noneOfTheAbove,
      ]);
    });
  });

  describe('status action', () => {
    it('publishes a draft section via the service', async () => {
      const section = twoLanguageSection();
      const fixture = createFixture(section);

      (
        fixture.nativeElement.querySelector(
          `[data-testid="status-action-${section.slug}"]`,
        ) as HTMLButtonElement
      ).click();
      await Promise.resolve();

      expect(service.publish).toHaveBeenCalledWith(section.id);
    });

    it('shows an error notice when the status action fails', async () => {
      service.publish.mockRejectedValueOnce(new Error('network error'));
      const section = twoLanguageSection();
      const fixture = createFixture(section);

      (
        fixture.nativeElement.querySelector(
          `[data-testid="status-action-${section.slug}"]`,
        ) as HTMLButtonElement
      ).click();
      await Promise.resolve();
      await Promise.resolve();

      expect(snackBarOpen).toHaveBeenCalled();
    });
  });
});

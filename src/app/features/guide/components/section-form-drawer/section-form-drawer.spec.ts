import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { MatSnackBar } from '@angular/material/snack-bar';
import { SectionFormDrawer } from './section-form-drawer';
import { SectionService } from '../../services/section.service';
import { TranslationSuggestionService } from '../../../../shared/services/translation-suggestion.service';
import { Question, QuestionType } from '../../models/section.model';
import { QuestionDraft } from '../question-editor/question-editor';
import { LanguageService } from '../../../../core/i18n/language.service';
import { TITLE_MAX_LENGTH } from '../../utils/field-limits';
import { FakeSectionService, makeSection } from '../../testing/fake-section-service';

async function settle(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

describe('SectionFormDrawer', () => {
  let service: FakeSectionService;
  let language: LanguageService;
  let suggestionService: { suggest: ReturnType<typeof vi.fn> };
  let snackBarOpen: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    service = new FakeSectionService();
    suggestionService = { suggest: vi.fn() };
    snackBarOpen = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        provideNoopAnimations(),
        { provide: SectionService, useValue: service },
        { provide: TranslationSuggestionService, useValue: suggestionService },
        { provide: MatSnackBar, useValue: { open: snackBarOpen } },
      ],
    });
    language = TestBed.inject(LanguageService);
  });

  function createFixture(targetLanguage: 'es' | 'en' | 'fr' | 'pt' = 'en') {
    const fixture = TestBed.createComponent(SectionFormDrawer);
    fixture.componentRef.setInput('targetLanguage', targetLanguage);
    fixture.detectChanges();
    return fixture;
  }

  function buttons(fixture: ReturnType<typeof createFixture>) {
    return {
      save: fixture.nativeElement.querySelector('[data-testid="save-button"]') as HTMLButtonElement,
      publish: fixture.nativeElement.querySelector(
        '[data-testid="publish-button"]',
      ) as HTMLButtonElement | null,
      cancel: fixture.nativeElement.querySelector(
        '[data-testid="cancel-button"]',
      ) as HTMLButtonElement,
    };
  }

  it('disables Save and Publish until title and description are filled', () => {
    const fixture = createFixture();
    const component = fixture.componentInstance;

    let { save, publish } = buttons(fixture);
    expect(save.disabled).toBe(true);
    expect(publish?.disabled).toBe(true);

    component.form.controls.title.setValue('A title');
    fixture.detectChanges();
    ({ save, publish } = buttons(fixture));
    expect(save.disabled).toBe(true);

    component.form.controls.description.setValue('A description');
    fixture.detectChanges();
    ({ save, publish } = buttons(fixture));
    expect(save.disabled).toBe(false);
    expect(publish?.disabled).toBe(false);
  });

  it('creates a draft section on Save for a new section', async () => {
    const fixture = createFixture('en');
    const component = fixture.componentInstance;
    let saved = false;
    component.saved.subscribe(() => (saved = true));

    component.form.controls.title.setValue('New section');
    component.form.controls.description.setValue('Description');
    fixture.detectChanges();
    buttons(fixture).save.click();
    await settle();

    expect(service.sections()).toHaveLength(1);
    expect(service.sections()[0].status).toBe('draft');
    expect(service.sections()[0].translations.en?.title).toBe('New section');
    expect(saved).toBe(true);
    expect(suggestionService.suggest).not.toHaveBeenCalled();
  });

  it('creates and publishes a section on Publish for a new section', async () => {
    const fixture = createFixture('en');
    const component = fixture.componentInstance;

    component.form.controls.title.setValue('New section');
    component.form.controls.description.setValue('Description');
    fixture.detectChanges();
    buttons(fixture).publish?.click();
    await settle();

    expect(service.sections()).toHaveLength(1);
    expect(service.sections()[0].status).toBe('published');
  });

  it('shows an error notice and does not emit saved when Save fails', async () => {
    service.create.mockRejectedValueOnce(new Error('network error'));
    const fixture = createFixture('en');
    const component = fixture.componentInstance;
    let saved = false;
    component.saved.subscribe(() => (saved = true));

    component.form.controls.title.setValue('New section');
    component.form.controls.description.setValue('Description');
    fixture.detectChanges();
    buttons(fixture).save.click();
    await settle();

    expect(saved).toBe(false);
    expect(snackBarOpen).toHaveBeenCalled();
  });

  it('shows the working-language indicator using the current UI language when creating', () => {
    language.setLanguage('es');
    const fixture = createFixture('es');

    expect(fixture.nativeElement.textContent).toContain(
      language.t().guide.sectionForm.workingLanguageLabel('Español'),
    );
  });

  it('updates an existing translation on Save without changing status', async () => {
    const existing = makeSection({
      slug: 'original',
      status: 'published',
      translations: { en: { title: 'Original', description: 'Original desc' } },
    });
    service.seed([existing]);
    const fixture = TestBed.createComponent(SectionFormDrawer);
    fixture.componentRef.setInput('section', existing);
    fixture.componentRef.setInput('targetLanguage', 'en');
    fixture.detectChanges();
    const component = fixture.componentInstance;

    component.form.controls.title.setValue('Updated title');
    fixture.detectChanges();
    buttons(fixture).save.click();
    await settle();

    const updated = service.sections()[0];
    expect(updated.translations.en?.title).toBe('Updated title');
    expect(updated.status).toBe('published');
    expect(suggestionService.suggest).not.toHaveBeenCalled();
  });

  it('hides the Publish button when editing an existing section', () => {
    const existing = makeSection({
      slug: 'original',
      translations: { en: { title: 'Original', description: 'Original desc' } },
    });
    service.seed([existing]);
    const fixture = TestBed.createComponent(SectionFormDrawer);
    fixture.componentRef.setInput('section', existing);
    fixture.componentRef.setInput('targetLanguage', 'en');
    fixture.detectChanges();

    expect(buttons(fixture).publish).toBeNull();
  });

  it('shows the Publish button when creating a new section', () => {
    const fixture = createFixture('en');

    expect(buttons(fixture).publish).not.toBeNull();
  });

  it('does not call the service on Cancel', () => {
    const fixture = createFixture('en');
    const component = fixture.componentInstance;
    let cancelled = false;
    component.cancelled.subscribe(() => (cancelled = true));

    component.form.controls.title.setValue('Should not be saved');
    component.form.controls.description.setValue('Should not be saved');
    fixture.detectChanges();
    buttons(fixture).cancel.click();

    expect(service.sections()).toHaveLength(0);
    expect(cancelled).toBe(true);
  });

  it('blocks submission and hides the preview for an invalid image URL, shows it for a valid one', () => {
    const fixture = createFixture('en');
    const component = fixture.componentInstance;

    component.form.controls.title.setValue('A title');
    component.form.controls.description.setValue('A description');
    (fixture.nativeElement.querySelector('[data-testid="gallery-add-button"]') as HTMLButtonElement).click();
    fixture.detectChanges();
    const urlInput = fixture.nativeElement.querySelector(
      '[data-testid="image-input-url-field"]',
    ) as HTMLInputElement;
    urlInput.value = 'not-a-url';
    urlInput.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(buttons(fixture).save.disabled).toBe(true);
    expect(fixture.nativeElement.querySelector('[data-testid="image-preview"]')).toBeNull();

    urlInput.value = 'https://example.com/image.png';
    urlInput.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(buttons(fixture).save.disabled).toBe(false);
    const preview = fixture.nativeElement.querySelector(
      '[data-testid="image-preview"]',
    ) as HTMLImageElement;
    expect(preview).not.toBeNull();
    expect(preview.src).toBe('https://example.com/image.png');
  });

  it('caps the image gallery at the default 3 images', () => {
    const fixture = createFixture('en');

    for (let i = 0; i < 3; i++) {
      (
        fixture.nativeElement.querySelector('[data-testid="gallery-add-button"]') as HTMLButtonElement
      ).click();
      fixture.detectChanges();
    }

    expect(fixture.nativeElement.querySelectorAll('[data-testid="gallery-row"]')).toHaveLength(3);
    expect(
      (fixture.nativeElement.querySelector('[data-testid="gallery-add-button"]') as HTMLButtonElement)
        .disabled,
    ).toBe(true);
  });

  describe('video link', () => {
    it('rejects a malformed URL and accepts a valid one', () => {
      const fixture = createFixture('en');
      const component = fixture.componentInstance;

      component.form.controls.title.setValue('A title');
      component.form.controls.description.setValue('A description');
      component.form.controls.videoUrl.setValue('not a url');
      fixture.detectChanges();

      expect(component.form.controls.videoUrl.hasError('pattern')).toBe(true);
      expect(buttons(fixture).save.disabled).toBe(true);

      component.form.controls.videoUrl.setValue('https://example.com/video.mp4');
      fixture.detectChanges();

      expect(component.form.controls.videoUrl.hasError('pattern')).toBe(false);
      expect(buttons(fixture).save.disabled).toBe(false);
    });

    it('round-trips through populate and persist', async () => {
      const existing = makeSection({
        slug: 'with-video',
        videoUrl: 'https://example.com/video.mp4',
        translations: { en: { title: 'With video', description: 'Desc' } },
      });
      service.seed([existing]);
      const fixture = TestBed.createComponent(SectionFormDrawer);
      fixture.componentRef.setInput('section', existing);
      fixture.componentRef.setInput('targetLanguage', 'en');
      fixture.detectChanges();
      const component = fixture.componentInstance;

      expect(component.form.controls.videoUrl.value).toBe('https://example.com/video.mp4');

      component.form.controls.title.setValue('With video updated');
      fixture.detectChanges();
      buttons(fixture).save.click();
      await settle();

      expect(service.sections()[0].videoUrl).toBe('https://example.com/video.mp4');
    });
  });

  describe('slug', () => {
    it('auto-suggests a slug from the title until the user edits the slug directly', () => {
      const fixture = createFixture('en');
      const component = fixture.componentInstance;

      component.form.controls.title.setValue('Getting Started');
      fixture.detectChanges();
      expect(component.form.controls.slug.value).toBe('getting-started');

      component.form.controls.title.setValue('Getting Started Fast');
      fixture.detectChanges();
      expect(component.form.controls.slug.value).toBe('getting-started-fast');

      component.form.controls.slug.setValue('custom-slug');
      fixture.detectChanges();

      component.form.controls.title.setValue('A Totally Different Title');
      fixture.detectChanges();
      expect(component.form.controls.slug.value).toBe('custom-slug');
    });

    it('blocks submission with a duplicate slug', () => {
      service.seed([
        makeSection({
          slug: 'existing-section',
          translations: { en: { title: 'Existing Section', description: 'Existing desc' } },
        }),
      ]);
      const fixture = createFixture('en');
      const component = fixture.componentInstance;

      component.form.controls.title.setValue('A title');
      component.form.controls.description.setValue('A description');
      component.form.controls.slug.setValue('existing-section');
      component.form.controls.slug.markAsTouched();
      fixture.detectChanges();

      expect(component.form.controls.slug.hasError('duplicateSlug')).toBe(true);
      expect(buttons(fixture).save.disabled).toBe(true);
      expect(fixture.nativeElement.querySelector('mat-error')?.textContent?.trim()).toBe(
        language.t().guide.sectionForm.duplicateSlugError,
      );

      component.form.controls.slug.setValue('a-unique-slug');
      fixture.detectChanges();

      expect(component.form.controls.slug.hasError('duplicateSlug')).toBe(false);
      expect(buttons(fixture).save.disabled).toBe(false);
    });

    it('allows keeping the same slug when editing the section that already owns it', () => {
      const existing = makeSection({
        slug: 'original-slug',
        translations: { en: { title: 'Original', description: 'Original desc' } },
      });
      service.seed([existing]);
      const fixture = TestBed.createComponent(SectionFormDrawer);
      fixture.componentRef.setInput('section', existing);
      fixture.componentRef.setInput('targetLanguage', 'en');
      fixture.detectChanges();
      const component = fixture.componentInstance;

      component.form.controls.slug.setValue('original-slug');
      fixture.detectChanges();

      expect(component.form.controls.slug.hasError('duplicateSlug')).toBe(false);
      expect(buttons(fixture).save.disabled).toBe(false);
    });

    it('rejects slugs that are not lowercase kebab-case', () => {
      const fixture = createFixture('en');
      const component = fixture.componentInstance;

      component.form.controls.title.setValue('A title');
      component.form.controls.description.setValue('A description');
      component.form.controls.slug.setValue('Not A Slug!');
      fixture.detectChanges();

      expect(component.form.controls.slug.hasError('pattern')).toBe(true);
      expect(buttons(fixture).save.disabled).toBe(true);

      component.form.controls.slug.setValue('a-valid-slug');
      fixture.detectChanges();

      expect(component.form.controls.slug.hasError('pattern')).toBe(false);
      expect(buttons(fixture).save.disabled).toBe(false);
    });

    it('persists the slug on save and keys updates by the section slug', async () => {
      const fixture = createFixture('en');
      const component = fixture.componentInstance;

      component.form.controls.title.setValue('New section');
      component.form.controls.description.setValue('Description');
      component.form.controls.slug.setValue('new-section');
      fixture.detectChanges();
      buttons(fixture).save.click();
      await settle();

      expect(service.sections()[0].slug).toBe('new-section');
    });
  });

  describe('question', () => {
    it('omits the question when its text is left empty', async () => {
      const fixture = createFixture('en');
      const component = fixture.componentInstance;

      component.form.controls.title.setValue('New section');
      component.form.controls.description.setValue('Description');
      fixture.detectChanges();
      buttons(fixture).save.click();
      await settle();

      expect(service.sections()[0].translations.en?.question).toBeUndefined();
    });

    it('persists a filled-in valid question on Save', async () => {
      const fixture = createFixture('en');
      const component = fixture.componentInstance;
      const question: QuestionDraft = {
        text: 'Is this correct?',
        type: 'yes-no',
        yesNoCorrectAnswer: 'yes',
      };

      component.form.controls.title.setValue('New section');
      component.form.controls.description.setValue('Description');
      component.form.controls.question.setValue(question);
      fixture.detectChanges();
      buttons(fixture).save.click();
      await settle();

      expect(service.sections()[0].translations.en?.question).toEqual(question);
    });

    it('disables Save and Publish while the question is invalid', () => {
      const fixture = createFixture('en');
      const component = fixture.componentInstance;

      component.form.controls.title.setValue('New section');
      component.form.controls.description.setValue('Description');
      component.form.controls.question.setValue({
        text: 'Is this correct?',
        type: '' as QuestionType,
      });
      fixture.detectChanges();

      expect(buttons(fixture).save.disabled).toBe(true);
      expect(buttons(fixture).publish?.disabled).toBe(true);

      component.form.controls.question.setValue({
        text: 'Is this correct?',
        type: 'yes-no',
        yesNoCorrectAnswer: 'yes',
      });
      fixture.detectChanges();

      expect(buttons(fixture).save.disabled).toBe(false);
      expect(buttons(fixture).publish?.disabled).toBe(false);
    });

    it('loads an existing question back into the form when editing', () => {
      const question: Question = {
        text: 'Pick one',
        type: 'single',
        answers: [
          { text: 'A', isCorrect: true },
          { text: 'B', isCorrect: false },
        ],
      };
      const existing = makeSection({
        slug: 'with-question',
        translations: { en: { title: 'With question', description: 'Desc', question } },
      });
      service.seed([existing]);
      const fixture = TestBed.createComponent(SectionFormDrawer);
      fixture.componentRef.setInput('section', existing);
      fixture.componentRef.setInput('targetLanguage', 'en');
      fixture.detectChanges();

      expect(fixture.componentInstance.form.controls.question.value).toEqual(question);
    });
  });

  describe('title character limit', () => {
    it('caps the title input and shows how many characters remain', () => {
      const fixture = createFixture('en');
      const titleInput = fixture.nativeElement.querySelector(
        'input[formcontrolname="title"]',
      ) as HTMLInputElement;
      expect(titleInput.maxLength).toBe(TITLE_MAX_LENGTH);

      fixture.componentInstance.form.controls.title.setValue('Hello');
      fixture.detectChanges();

      expect(fixture.nativeElement.textContent).toContain(
        language.t().fieldLimits.charactersRemaining(TITLE_MAX_LENGTH - 5),
      );
    });
  });

  describe('country availability', () => {
    it('persists availableCountries as undefined when scope is "all" (the default)', async () => {
      const fixture = createFixture('en');
      const component = fixture.componentInstance;

      component.form.controls.title.setValue('New section');
      component.form.controls.description.setValue('Description');
      fixture.detectChanges();
      buttons(fixture).save.click();
      await settle();

      expect(service.sections()[0].availableCountries).toBeUndefined();
    });

    it('persists the selected countries when scope is "specific"', async () => {
      const fixture = createFixture('en');
      const component = fixture.componentInstance;

      component.form.controls.title.setValue('New section');
      component.form.controls.description.setValue('Description');
      component.form.controls.countryScope.setValue('specific');
      component.form.controls.countries.setValue(['AR', 'BR']);
      fixture.detectChanges();
      buttons(fixture).save.click();
      await settle();

      expect(service.sections()[0].availableCountries).toEqual(['AR', 'BR']);
    });

    it('is invalid when scope is "specific" with zero countries selected', () => {
      const fixture = createFixture('en');
      const component = fixture.componentInstance;

      component.form.controls.title.setValue('New section');
      component.form.controls.description.setValue('Description');
      component.form.controls.countryScope.setValue('specific');
      fixture.detectChanges();

      expect(buttons(fixture).save.disabled).toBe(true);

      component.form.controls.countries.setValue(['AR']);
      fixture.detectChanges();

      expect(buttons(fixture).save.disabled).toBe(false);
    });
  });

  it('shows a required indicator on the Description label', () => {
    const fixture = createFixture('en');

    const label = fixture.nativeElement.querySelector(
      '[data-testid="description-label"]',
    ) as HTMLElement;

    expect(label.textContent?.trim()).toBe(language.t().guide.sectionForm.descriptionLabel);
  });

  describe('AI-suggested translation', () => {
    function sectionWithEnglish() {
      const section = makeSection({
        slug: 'multi',
        translations: { en: { title: 'Getting started', description: 'Intro text' } },
      });
      service.seed([section]);
      return section;
    }

    it('requests a suggestion when adding a new language, shows loading, and pre-fills on success', async () => {
      let resolveSuggest!: (value: { title: string; description: string }) => void;
      suggestionService.suggest.mockReturnValue(
        new Promise((resolve) => {
          resolveSuggest = resolve;
        }),
      );
      const existing = sectionWithEnglish();
      const fixture = TestBed.createComponent(SectionFormDrawer);
      fixture.componentRef.setInput('section', existing);
      fixture.componentRef.setInput('targetLanguage', 'es');
      fixture.componentRef.setInput('sourceLanguage', 'en');
      fixture.detectChanges();

      expect(suggestionService.suggest).toHaveBeenCalledWith(
        { language: 'en', fields: { title: 'Getting started', description: 'Intro text' } },
        'es',
      );
      expect(fixture.componentInstance.loading()).toBe(true);

      resolveSuggest({ title: 'Empezando', description: 'Texto de introducción' });
      await settle();
      fixture.detectChanges();

      expect(fixture.componentInstance.loading()).toBe(false);
      expect(fixture.componentInstance.form.controls.title.value).toBe('Empezando');
      expect(fixture.componentInstance.form.controls.description.value).toBe(
        'Texto de introducción',
      );
      expect(fixture.componentInstance.form.controls.slug.value).toBe('multi');
    });

    it('only requests a suggestion once even if change detection runs again with the same inputs', () => {
      suggestionService.suggest.mockReturnValue(new Promise(() => {}));
      const existing = sectionWithEnglish();
      const fixture = TestBed.createComponent(SectionFormDrawer);
      fixture.componentRef.setInput('section', existing);
      fixture.componentRef.setInput('targetLanguage', 'es');
      fixture.componentRef.setInput('sourceLanguage', 'en');
      fixture.detectChanges();
      fixture.detectChanges();
      fixture.detectChanges();

      expect(suggestionService.suggest).toHaveBeenCalledTimes(1);
    });

    it('falls back to the untranslated source text and notifies on failure', async () => {
      suggestionService.suggest.mockRejectedValue(new Error('network error'));
      const existing = sectionWithEnglish();
      const fixture = TestBed.createComponent(SectionFormDrawer);
      fixture.componentRef.setInput('section', existing);
      fixture.componentRef.setInput('targetLanguage', 'es');
      fixture.componentRef.setInput('sourceLanguage', 'en');
      fixture.detectChanges();

      await settle();
      fixture.detectChanges();

      expect(fixture.componentInstance.loading()).toBe(false);
      expect(fixture.componentInstance.form.controls.title.value).toBe('Getting started');
      expect(fixture.componentInstance.form.controls.description.value).toBe('Intro text');
      expect(snackBarOpen).toHaveBeenCalled();
    });

    it('does not request a suggestion when editing an already-translated language', () => {
      const existing = sectionWithEnglish();
      const fixture = TestBed.createComponent(SectionFormDrawer);
      fixture.componentRef.setInput('section', existing);
      fixture.componentRef.setInput('targetLanguage', 'en');
      fixture.componentRef.setInput('sourceLanguage', 'en');
      fixture.detectChanges();

      expect(suggestionService.suggest).not.toHaveBeenCalled();
    });
  });

  describe('stale translation review', () => {
    function sectionWithEnglishAndSpanish() {
      const section = makeSection({
        slug: 'multi',
        translations: {
          en: { title: 'Getting started v2', description: 'Intro text v2' },
          es: { title: 'Empezando', description: 'Texto intro' },
        },
      });
      service.seed([section]);
      return section;
    }

    function createStaleFixture() {
      const existing = sectionWithEnglishAndSpanish();
      const fixture = TestBed.createComponent(SectionFormDrawer);
      fixture.componentRef.setInput('section', existing);
      fixture.componentRef.setInput('targetLanguage', 'es');
      fixture.componentRef.setInput('staleSourceLanguage', 'en');
      fixture.detectChanges();
      return fixture;
    }

    it('does not show Preview buttons for a normal edit (no staleSourceLanguage)', () => {
      const existing = sectionWithEnglishAndSpanish();
      const fixture = TestBed.createComponent(SectionFormDrawer);
      fixture.componentRef.setInput('section', existing);
      fixture.componentRef.setInput('targetLanguage', 'es');
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('[data-testid="preview-title-button"]')).toBeNull();
      expect(
        fixture.nativeElement.querySelector('[data-testid="preview-description-button"]'),
      ).toBeNull();
      expect(suggestionService.suggest).not.toHaveBeenCalled();
    });

    it('calls the AI automatically when opening a flagged-stale language, without needing a Preview click', () => {
      suggestionService.suggest.mockReturnValue(new Promise(() => {}));

      createStaleFixture();

      expect(suggestionService.suggest).toHaveBeenCalledWith(
        { language: 'en', fields: { title: 'Getting started v2', description: 'Intro text v2' } },
        'es',
      );
    });

    it('shows a loading indicator while the automatic fetch is in flight', () => {
      suggestionService.suggest.mockReturnValue(new Promise(() => {}));

      const fixture = createStaleFixture();

      expect(
        fixture.nativeElement.querySelector('[data-testid="stale-preview-loading"]'),
      ).not.toBeNull();
    });

    it('only shows a Preview button for fields whose suggestion actually differs from the current value', async () => {
      suggestionService.suggest.mockResolvedValue({
        title: 'Getting started v2 (es)',
        description: 'Texto intro',
      });
      const fixture = createStaleFixture();
      await settle();
      fixture.detectChanges();

      expect(
        fixture.nativeElement.querySelector('[data-testid="preview-title-button"]'),
      ).not.toBeNull();
      expect(
        fixture.nativeElement.querySelector('[data-testid="preview-description-button"]'),
      ).toBeNull();
    });

    it('reveals title and description panels on Preview without calling the AI again', async () => {
      suggestionService.suggest.mockResolvedValue({
        title: 'Getting started v2 (es)',
        description: 'Intro text v2 (es)',
      });
      const fixture = createStaleFixture();
      await settle();
      fixture.detectChanges();

      (
        fixture.nativeElement.querySelector('[data-testid="preview-title-button"]') as HTMLButtonElement
      ).click();
      fixture.detectChanges();

      expect(suggestionService.suggest).toHaveBeenCalledTimes(1);
      const titlePanel = fixture.nativeElement.querySelector('[data-testid="title-preview-panel"]');
      const descriptionPanel = fixture.nativeElement.querySelector(
        '[data-testid="description-preview-panel"]',
      );
      expect(titlePanel?.textContent).toContain('Getting started v2 (es)');
      expect(descriptionPanel?.textContent).toContain('Intro text v2 (es)');
    });

    it('caches the suggestion so reopening for the same unchanged row does not refetch', async () => {
      suggestionService.suggest.mockResolvedValue({
        title: 'Getting started v2 (es)',
        description: 'Intro text v2 (es)',
      });
      const section = sectionWithEnglishAndSpanish();
      const first = TestBed.createComponent(SectionFormDrawer);
      first.componentRef.setInput('section', section);
      first.componentRef.setInput('targetLanguage', 'es');
      first.componentRef.setInput('staleSourceLanguage', 'en');
      first.detectChanges();
      await settle();
      expect(suggestionService.suggest).toHaveBeenCalledTimes(1);

      const second = TestBed.createComponent(SectionFormDrawer);
      second.componentRef.setInput('section', service.sections()[0]);
      second.componentRef.setInput('targetLanguage', 'es');
      second.componentRef.setInput('staleSourceLanguage', 'en');
      second.detectChanges();
      await settle();
      second.detectChanges();

      expect(suggestionService.suggest).toHaveBeenCalledTimes(1);
      (
        second.nativeElement.querySelector('[data-testid="preview-title-button"]') as HTMLButtonElement
      ).click();
      second.detectChanges();
      expect(
        second.nativeElement.querySelector('[data-testid="title-preview-panel"]')?.textContent,
      ).toContain('Getting started v2 (es)');
    });

    it('refetches when the source translation has changed since it was cached', async () => {
      suggestionService.suggest
        .mockResolvedValueOnce({ title: 'V1 (es)', description: 'Intro text v2 (es)' })
        .mockResolvedValueOnce({ title: 'V2 (es)', description: 'Intro text v3 (es)' });
      const section = sectionWithEnglishAndSpanish();
      const first = TestBed.createComponent(SectionFormDrawer);
      first.componentRef.setInput('section', section);
      first.componentRef.setInput('targetLanguage', 'es');
      first.componentRef.setInput('staleSourceLanguage', 'en');
      first.detectChanges();
      await settle();

      await service.saveTranslation(section.id, {
        slug: section.slug,
        images: [],
        language: 'en',
        translation: { title: 'Getting started v3', description: 'Intro text v3' },
      });

      const second = TestBed.createComponent(SectionFormDrawer);
      second.componentRef.setInput('section', service.sections()[0]);
      second.componentRef.setInput('targetLanguage', 'es');
      second.componentRef.setInput('staleSourceLanguage', 'en');
      second.detectChanges();
      await settle();

      expect(suggestionService.suggest).toHaveBeenCalledTimes(2);
    });

    it('accepting the title suggestion only updates the title field, leaving the slug untouched', async () => {
      suggestionService.suggest.mockResolvedValue({
        title: 'Getting started v2 (es)',
        description: 'Intro text v2 (es)',
      });
      const fixture = createStaleFixture();
      const component = fixture.componentInstance;
      await settle();
      fixture.detectChanges();

      (
        fixture.nativeElement.querySelector('[data-testid="preview-title-button"]') as HTMLButtonElement
      ).click();
      fixture.detectChanges();
      (
        fixture.nativeElement.querySelector('[data-testid="accept-title-button"]') as HTMLButtonElement
      ).click();

      expect(component.form.controls.title.value).toBe('Getting started v2 (es)');
      expect(component.form.controls.description.value).toBe('Texto intro');
      expect(component.form.controls.slug.value).toBe('multi');
    });

    it('accepting the description suggestion only updates the description field', async () => {
      suggestionService.suggest.mockResolvedValue({
        title: 'Getting started v2 (es)',
        description: 'Intro text v2 (es)',
      });
      const fixture = createStaleFixture();
      const component = fixture.componentInstance;
      await settle();
      fixture.detectChanges();

      (
        fixture.nativeElement.querySelector(
          '[data-testid="preview-description-button"]',
        ) as HTMLButtonElement
      ).click();
      fixture.detectChanges();
      (
        fixture.nativeElement.querySelector(
          '[data-testid="accept-description-button"]',
        ) as HTMLButtonElement
      ).click();

      expect(component.form.controls.description.value).toBe('Intro text v2 (es)');
      expect(component.form.controls.title.value).toBe('Empezando');
    });

    it('shows a notice on failure and no Preview button ever appears', async () => {
      suggestionService.suggest.mockRejectedValue(new Error('network error'));
      const fixture = createStaleFixture();

      await settle();
      fixture.detectChanges();

      expect(snackBarOpen).toHaveBeenCalled();
      expect(fixture.nativeElement.querySelector('[data-testid="preview-title-button"]')).toBeNull();
      expect(fixture.componentInstance.form.controls.title.value).toBe('Empezando');
    });
  });
});

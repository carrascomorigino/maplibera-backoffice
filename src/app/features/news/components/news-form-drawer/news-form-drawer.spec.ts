import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { MatSnackBar } from '@angular/material/snack-bar';
import { NewsFormDrawer } from './news-form-drawer';
import { NewsItemService } from '../../services/news-item.service';
import { TranslationSuggestionService } from '../../../../shared/services/translation-suggestion.service';
import { LanguageService } from '../../../../core/i18n/language.service';
import { FakeNewsItemService, makeNewsItem } from '../../testing/fake-news-item-service';
import { TITLE_MAX_LENGTH, SUBTITLE_MAX_LENGTH, DESCRIPTION_MAX_LENGTH } from '../../utils/field-limits';

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

// A plain chain of microtask `await`s isn't deep enough here: resolving gallery images
// goes through `resolveImagePayload` (itself async) inside a `Promise.all(...).map(...)`,
// adding more microtask hops than the fixed-depth chain used elsewhere covers. Flushing at
// a macrotask boundary drains the whole microtask queue regardless of depth.
async function settle(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

describe('NewsFormDrawer', () => {
  let service: FakeNewsItemService;
  let language: LanguageService;
  let suggestionService: { suggest: ReturnType<typeof vi.fn> };
  let snackBarOpen: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    service = new FakeNewsItemService();
    suggestionService = { suggest: vi.fn() };
    snackBarOpen = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        provideNoopAnimations(),
        { provide: NewsItemService, useValue: service },
        { provide: TranslationSuggestionService, useValue: suggestionService },
        { provide: MatSnackBar, useValue: { open: snackBarOpen } },
      ],
    });
    language = TestBed.inject(LanguageService);
  });

  function createFixture(targetLanguage: 'es' | 'en' | 'fr' | 'pt' = 'en') {
    const fixture = TestBed.createComponent(NewsFormDrawer);
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
      cancel: fixture.nativeElement.querySelector('[data-testid="cancel-button"]') as HTMLButtonElement,
    };
  }

  function fillRequiredFields(component: NewsFormDrawer) {
    component.form.controls.title.setValue('New visitor center');
    component.form.controls.subtitle.setValue('Now open');
    component.form.controls.description.setValue('Details');
    component.form.controls.images.setValue([
      { image: { kind: 'url', url: 'https://example.com/banner.jpg' } },
    ]);
  }

  function existingItem() {
    const item = makeNewsItem({
      slug: 'existing',
      publishedAt: todayIso(),
      translations: { en: { title: 'Existing', subtitle: 'Sub', description: 'Desc' } },
    });
    service.seed([item]);
    return item;
  }

  it('defaults category to news and publishedAt to today', () => {
    const fixture = createFixture();
    const component = fixture.componentInstance;

    expect(component.form.controls.category.value).toBe('news');
    expect(component.form.controls.publishedAt.value).toBe(todayIso());
  });

  it('enables the category control only when creating a new item', () => {
    const createFixtureInstance = createFixture();
    expect(createFixtureInstance.componentInstance.form.controls.category.disabled).toBe(false);

    const created = existingItem();
    const editFixture = TestBed.createComponent(NewsFormDrawer);
    editFixture.componentRef.setInput('item', created);
    editFixture.componentRef.setInput('targetLanguage', 'en');
    editFixture.detectChanges();

    expect(editFixture.componentInstance.form.controls.category.disabled).toBe(true);
  });

  it('disables Save until title, subtitle, description and at least one image are filled', () => {
    const fixture = createFixture();
    const component = fixture.componentInstance;

    expect(buttons(fixture).save.disabled).toBe(true);

    fillRequiredFields(component);
    fixture.detectChanges();

    expect(buttons(fixture).save.disabled).toBe(false);
  });

  it('requires eventDate only when category is event, and clears it when switching back to news', () => {
    const fixture = createFixture();
    const component = fixture.componentInstance;
    fillRequiredFields(component);
    fixture.detectChanges();
    expect(buttons(fixture).save.disabled).toBe(false);

    component.form.controls.category.setValue('event');
    fixture.detectChanges();
    expect(component.form.controls.eventDate.hasError('eventDateRequired')).toBe(true);
    expect(buttons(fixture).save.disabled).toBe(true);

    component.form.controls.eventDate.setValue('2026-08-15');
    fixture.detectChanges();
    expect(buttons(fixture).save.disabled).toBe(false);

    component.form.controls.category.setValue('news');
    fixture.detectChanges();
    expect(component.form.controls.eventDate.value).toBeNull();
    expect(buttons(fixture).save.disabled).toBe(false);
  });

  it('creates a draft news item on Save', async () => {
    const fixture = createFixture();
    const component = fixture.componentInstance;
    let saved = false;
    component.saved.subscribe(() => (saved = true));

    fillRequiredFields(component);
    fixture.detectChanges();
    buttons(fixture).save.click();
    await settle();

    expect(service.items()).toHaveLength(1);
    expect(service.items()[0].category).toBe('news');
    expect(service.items()[0].status).toBe('draft');
    expect(service.items()[0].translations.en?.title).toBe('New visitor center');
    expect(saved).toBe(true);
  });

  it('creates an event with its eventDate on Save', async () => {
    const fixture = createFixture();
    const component = fixture.componentInstance;

    fillRequiredFields(component);
    component.form.controls.category.setValue('event');
    component.form.controls.eventDate.setValue('2026-08-15');
    fixture.detectChanges();
    buttons(fixture).save.click();
    await settle();

    expect(service.items()[0].category).toBe('event');
    expect(service.items()[0].eventDate).toBe('2026-08-15');
  });

  it('creates and publishes on Publish for a new item', async () => {
    const fixture = createFixture();
    const component = fixture.componentInstance;

    fillRequiredFields(component);
    fixture.detectChanges();
    buttons(fixture).publish?.click();
    await settle();

    expect(service.items()[0].status).toBe('published');
  });

  it('shows an error notice when Save fails', async () => {
    service.create.mockRejectedValueOnce(new Error('network error'));
    const fixture = createFixture();
    const component = fixture.componentInstance;

    fillRequiredFields(component);
    fixture.detectChanges();
    buttons(fixture).save.click();
    await settle();

    expect(snackBarOpen).toHaveBeenCalled();
  });

  it('hides the Publish button when editing an existing item', () => {
    const created = existingItem();
    const fixture = TestBed.createComponent(NewsFormDrawer);
    fixture.componentRef.setInput('item', created);
    fixture.componentRef.setInput('targetLanguage', 'en');
    fixture.detectChanges();

    expect(buttons(fixture).publish).toBeNull();
  });

  it('splits shared vs. translated fields correctly on save', async () => {
    const created = makeNewsItem({
      slug: 'existing',
      images: [{ url: 'https://example.com/old.jpg' }],
      publishedAt: '2026-01-01',
      translations: { en: { title: 'Existing', subtitle: 'Sub', description: 'Desc' } },
    });
    service.seed([created]);
    const fixture = TestBed.createComponent(NewsFormDrawer);
    fixture.componentRef.setInput('item', created);
    fixture.componentRef.setInput('targetLanguage', 'en');
    fixture.detectChanges();
    const component = fixture.componentInstance;

    component.form.controls.images.setValue([
      { image: { kind: 'url', url: 'https://example.com/new.jpg' } },
    ]);
    component.form.controls.publishedAt.setValue('2026-09-01');
    component.form.controls.sourceLinks.setValue(['https://example.com/source']);
    component.form.controls.title.setValue('Updated title');
    fixture.detectChanges();
    buttons(fixture).save.click();
    await settle();

    const updated = service.items()[0];
    expect(updated.images).toEqual([{ url: 'https://example.com/new.jpg', description: undefined }]);
    expect(updated.publishedAt).toBe('2026-09-01');
    expect(updated.sourceLinks).toEqual(['https://example.com/source']);
    expect(updated.translations.en?.title).toBe('Updated title');
  });

  describe('slug', () => {
    it('auto-suggests a slug from the title until manually edited', () => {
      const fixture = createFixture();
      const component = fixture.componentInstance;

      component.form.controls.title.setValue('Grand Opening Event');
      fixture.detectChanges();
      expect(component.form.controls.slug.value).toBe('grand-opening-event');
    });

    it('blocks submission with a duplicate slug', () => {
      service.seed([makeNewsItem({ slug: 'existing-item' })]);
      const fixture = createFixture();
      const component = fixture.componentInstance;

      fillRequiredFields(component);
      component.form.controls.slug.setValue('existing-item');
      fixture.detectChanges();

      expect(component.form.controls.slug.hasError('duplicateSlug')).toBe(true);
      expect(buttons(fixture).save.disabled).toBe(true);
    });
  });

  describe('image gallery', () => {
    it('requires at least one image and blocks submission until one is added', () => {
      const fixture = createFixture();
      const component = fixture.componentInstance;

      component.form.controls.title.setValue('A title');
      component.form.controls.subtitle.setValue('A subtitle');
      component.form.controls.description.setValue('A description');
      fixture.detectChanges();

      expect(component.form.controls.images.hasError('galleryRequired')).toBe(true);
      expect(buttons(fixture).save.disabled).toBe(true);
      expect(fixture.nativeElement.querySelector('mat-error')?.textContent?.trim()).toBe(
        language.t().news.newsForm.imagesRequiredError,
      );

      component.form.controls.images.setValue([
        { image: { kind: 'url', url: 'https://example.com/banner.jpg' } },
      ]);
      fixture.detectChanges();

      expect(component.form.controls.images.hasError('galleryRequired')).toBe(false);
      expect(buttons(fixture).save.disabled).toBe(false);
    });

    it('caps the image gallery at the default 3 images', () => {
      const fixture = createFixture();

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
  });

  describe('video link', () => {
    it('rejects a malformed URL and accepts a valid one', () => {
      const fixture = createFixture();
      const component = fixture.componentInstance;

      fillRequiredFields(component);
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
      const existing = makeNewsItem({
        slug: 'with-video',
        videoUrl: 'https://example.com/video.mp4',
        publishedAt: todayIso(),
        translations: { en: { title: 'With video', subtitle: 'Sub', description: 'Desc' } },
      });
      service.seed([existing]);
      const fixture = TestBed.createComponent(NewsFormDrawer);
      fixture.componentRef.setInput('item', existing);
      fixture.componentRef.setInput('targetLanguage', 'en');
      fixture.detectChanges();
      const component = fixture.componentInstance;

      expect(component.form.controls.videoUrl.value).toBe('https://example.com/video.mp4');

      component.form.controls.title.setValue('With video updated');
      fixture.detectChanges();
      buttons(fixture).save.click();
      await settle();

      expect(service.items()[0].videoUrl).toBe('https://example.com/video.mp4');
    });
  });

  describe('character limits', () => {
    it('caps the title input and shows how many characters remain', () => {
      const fixture = createFixture();
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

    it('caps the subtitle input and shows how many characters remain', () => {
      const fixture = createFixture();
      const subtitleInput = fixture.nativeElement.querySelector(
        'input[formcontrolname="subtitle"]',
      ) as HTMLInputElement;
      expect(subtitleInput.maxLength).toBe(SUBTITLE_MAX_LENGTH);

      fixture.componentInstance.form.controls.subtitle.setValue('Hi there');
      fixture.detectChanges();

      expect(fixture.nativeElement.textContent).toContain(
        language.t().fieldLimits.charactersRemaining(SUBTITLE_MAX_LENGTH - 8),
      );
    });

    it('activates the markdown editor character counter for description', () => {
      const fixture = createFixture();
      fixture.detectChanges();

      const counter = fixture.nativeElement.querySelector('[data-testid="markdown-char-counter"]');
      expect(counter).not.toBeNull();
      expect(counter?.textContent?.trim()).toBe(
        language.t().fieldLimits.charactersRemaining(DESCRIPTION_MAX_LENGTH),
      );
    });
  });

  describe('AI-suggested translation', () => {
    it('requests a suggestion when adding a new language and pre-fills on success', async () => {
      let resolveSuggest!: (value: Record<string, unknown>) => void;
      suggestionService.suggest.mockReturnValue(
        new Promise((resolve) => {
          resolveSuggest = resolve;
        }),
      );
      const existing = existingItem();
      const fixture = TestBed.createComponent(NewsFormDrawer);
      fixture.componentRef.setInput('item', existing);
      fixture.componentRef.setInput('targetLanguage', 'es');
      fixture.componentRef.setInput('sourceLanguage', 'en');
      fixture.detectChanges();

      expect(suggestionService.suggest).toHaveBeenCalledWith(
        { language: 'en', fields: { title: 'Existing', subtitle: 'Sub', description: 'Desc' } },
        'es',
      );
      expect(fixture.componentInstance.loading()).toBe(true);

      resolveSuggest({ title: 'Existente', subtitle: 'Sub es', description: 'Desc es' });
      await settle();
      fixture.detectChanges();

      expect(fixture.componentInstance.loading()).toBe(false);
      expect(fixture.componentInstance.form.controls.title.value).toBe('Existente');
    });

    it('does not request a suggestion when editing an already-translated language', () => {
      const existing = existingItem();
      const fixture = TestBed.createComponent(NewsFormDrawer);
      fixture.componentRef.setInput('item', existing);
      fixture.componentRef.setInput('targetLanguage', 'en');
      fixture.detectChanges();

      expect(suggestionService.suggest).not.toHaveBeenCalled();
    });
  });

  it('shows the working-language indicator', () => {
    language.setLanguage('es');
    const fixture = createFixture('es');

    expect(fixture.nativeElement.textContent).toContain(
      language.t().news.newsForm.workingLanguageLabel('Español'),
    );
  });

  it('does not call the service on Cancel', () => {
    const fixture = createFixture();
    const component = fixture.componentInstance;
    let cancelled = false;
    component.cancelled.subscribe(() => (cancelled = true));

    component.form.controls.title.setValue('Should not be saved');
    fixture.detectChanges();
    buttons(fixture).cancel.click();

    expect(service.items()).toHaveLength(0);
    expect(cancelled).toBe(true);
  });
});

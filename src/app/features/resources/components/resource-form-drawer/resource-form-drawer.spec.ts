import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ResourceFormDrawer } from './resource-form-drawer';
import { ResourceService } from '../../services/resource.service';
import { TranslationSuggestionService } from '../../../../shared/services/translation-suggestion.service';
import { LanguageService } from '../../../../core/i18n/language.service';
import { AppResource, MultimediaResource, RecipeResource, Resource } from '../../models/resource.model';
import { FakeResourceService, makeResource } from '../../testing/fake-resource-service';
import { TITLE_MAX_LENGTH, SHORT_DESCRIPTION_MAX_LENGTH } from '../../utils/field-limits';

async function settle(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

describe('ResourceFormDrawer', () => {
  let service: FakeResourceService;
  let language: LanguageService;
  let suggestionService: { suggest: ReturnType<typeof vi.fn> };
  let snackBarOpen: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    service = new FakeResourceService();
    suggestionService = { suggest: vi.fn() };
    snackBarOpen = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        provideNoopAnimations(),
        { provide: ResourceService, useValue: service },
        { provide: TranslationSuggestionService, useValue: suggestionService },
        { provide: MatSnackBar, useValue: { open: snackBarOpen } },
      ],
    });
    language = TestBed.inject(LanguageService);
  });

  function createFixture(
    category: 'nutrition' | 'recipes' | 'multimedia' | 'apps' = 'nutrition',
    targetLanguage: 'es' | 'en' | 'fr' | 'pt' = 'en',
  ) {
    const fixture = TestBed.createComponent(ResourceFormDrawer);
    fixture.componentRef.setInput('category', category);
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

  it('disables Save until title, slug and short description are filled', () => {
    const fixture = createFixture();
    const component = fixture.componentInstance;

    expect(buttons(fixture).save.disabled).toBe(true);

    component.form.controls.title.setValue('Omega 3');
    component.form.controls.shortDescription.setValue('Good fats');
    fixture.detectChanges();

    expect(buttons(fixture).save.disabled).toBe(false);
  });

  it('creates a draft resource of the locked category on Save', async () => {
    const fixture = createFixture('nutrition');
    const component = fixture.componentInstance;
    let saved = false;
    component.saved.subscribe(() => (saved = true));

    component.form.controls.title.setValue('Omega 3');
    component.form.controls.shortDescription.setValue('Good fats');
    fixture.detectChanges();
    buttons(fixture).save.click();
    await settle();

    expect(service.resources()).toHaveLength(1);
    expect(service.resources()[0].category).toBe('nutrition');
    expect(service.resources()[0].status).toBe('draft');
    expect(service.resources()[0].translations.en?.title).toBe('Omega 3');
    expect(saved).toBe(true);
  });

  it('creates and publishes on Publish for a new resource', async () => {
    const fixture = createFixture('nutrition');
    const component = fixture.componentInstance;

    component.form.controls.title.setValue('Omega 3');
    component.form.controls.shortDescription.setValue('Good fats');
    fixture.detectChanges();
    buttons(fixture).publish?.click();
    await settle();

    expect(service.resources()[0].status).toBe('published');
  });

  it('shows an error notice when Save fails', async () => {
    service.create.mockRejectedValueOnce(new Error('network error'));
    const fixture = createFixture('nutrition');
    const component = fixture.componentInstance;

    component.form.controls.title.setValue('Omega 3');
    component.form.controls.shortDescription.setValue('Good fats');
    fixture.detectChanges();
    buttons(fixture).save.click();
    await settle();

    expect(snackBarOpen).toHaveBeenCalled();
  });

  it('hides the Publish button when editing an existing resource', () => {
    const created = makeResource({
      category: 'nutrition',
      slug: 'omega-3',
      sourceLinks: [],
      pdfUrls: [],
      images: [],
      translations: { en: { title: 'Omega 3', shortDescription: 'Good fats' } },
    } as Partial<Resource>);
    service.seed([created]);
    const fixture = TestBed.createComponent(ResourceFormDrawer);
    fixture.componentRef.setInput('resource', created);
    fixture.componentRef.setInput('category', 'nutrition');
    fixture.componentRef.setInput('targetLanguage', 'en');
    fixture.detectChanges();

    expect(buttons(fixture).publish).toBeNull();
  });

  it('splits shared vs. translated fields correctly for a recipe on save', async () => {
    const created = makeResource({
      category: 'recipes',
      slug: 'soup',
      preparationMinutes: 10,
      images: [],
      translations: { en: { title: 'Soup', shortDescription: 'Warm', ingredients: ['Water'], steps: ['Boil'] } },
    } as unknown as Partial<Resource>);
    service.seed([created]);
    const fixture = TestBed.createComponent(ResourceFormDrawer);
    fixture.componentRef.setInput('resource', created);
    fixture.componentRef.setInput('category', 'recipes');
    fixture.componentRef.setInput('targetLanguage', 'en');
    fixture.detectChanges();
    const component = fixture.componentInstance;

    component.form.controls.categoryFields.setValue({
      preparationMinutes: 20,
      ingredients: ['Water', 'Salt'],
      steps: ['Boil', 'Season'],
    });
    fixture.detectChanges();
    buttons(fixture).save.click();
    await settle();

    const updated = service.resources()[0] as RecipeResource;
    expect(updated.preparationMinutes).toBe(20);
    expect(updated.translations.en?.ingredients).toEqual(['Water', 'Salt']);
    expect(updated.translations.en?.steps).toEqual(['Boil', 'Season']);
  });

  describe('images gallery', () => {
    it('round-trips existing resource images into the gallery for editing', () => {
      const created = makeResource({
        category: 'recipes',
        slug: 'soup',
        preparationMinutes: 10,
        images: [{ url: 'https://example.com/soup.png' }],
        translations: { en: { title: 'Soup', shortDescription: 'Warm', ingredients: [], steps: [] } },
      } as unknown as Partial<Resource>);
      service.seed([created]);
      const fixture = TestBed.createComponent(ResourceFormDrawer);
      fixture.componentRef.setInput('resource', created);
      fixture.componentRef.setInput('category', 'recipes');
      fixture.componentRef.setInput('targetLanguage', 'en');
      fixture.detectChanges();
      const component = fixture.componentInstance;

      expect(component.form.controls.images.value).toEqual([
        { image: { kind: 'url', url: 'https://example.com/soup.png' }, description: undefined },
      ]);
    });

    it('persists gallery rows to the shared images field on save', async () => {
      const fixture = createFixture('multimedia');
      const component = fixture.componentInstance;

      component.form.controls.title.setValue('Doc');
      component.form.controls.shortDescription.setValue('A documentary');
      component.form.controls.categoryFields.setValue({
        mediaType: 'documentary',
        externalUrl: 'https://example.com/watch',
      });
      (fixture.nativeElement.querySelector('[data-testid="gallery-add-button"]') as HTMLButtonElement).click();
      fixture.detectChanges();
      const urlInput = fixture.nativeElement.querySelector(
        '[data-testid="image-input-url-field"]',
      ) as HTMLInputElement;
      urlInput.value = 'https://example.com/poster.png';
      urlInput.dispatchEvent(new Event('input'));
      fixture.detectChanges();
      buttons(fixture).save.click();
      await settle();

      const updated = service.resources()[0] as MultimediaResource;
      expect(updated.images).toEqual([{ url: 'https://example.com/poster.png' }]);
    });

    it('caps the image gallery at the default 3 images', () => {
      const fixture = createFixture('apps');

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
    it.each(['nutrition', 'recipes', 'apps'] as const)(
      'shows the video link field for %s',
      (category) => {
        const fixture = createFixture(category);

        expect(fixture.nativeElement.querySelector('input[formcontrolname="videoUrl"]')).not.toBeNull();
      },
    );

    it('hides the video link field for multimedia', () => {
      const fixture = createFixture('multimedia');

      expect(fixture.nativeElement.querySelector('input[formcontrolname="videoUrl"]')).toBeNull();
    });

    it('rejects a malformed URL and accepts a valid one', () => {
      const fixture = createFixture('nutrition');
      const component = fixture.componentInstance;

      component.form.controls.title.setValue('Omega 3');
      component.form.controls.shortDescription.setValue('Good fats');
      component.form.controls.videoUrl.setValue('not a url');
      fixture.detectChanges();

      expect(component.form.controls.videoUrl.hasError('pattern')).toBe(true);
      expect(buttons(fixture).save.disabled).toBe(true);

      component.form.controls.videoUrl.setValue('https://example.com/video.mp4');
      fixture.detectChanges();

      expect(component.form.controls.videoUrl.hasError('pattern')).toBe(false);
      expect(buttons(fixture).save.disabled).toBe(false);
    });

    it('persists the video link for a category that supports it', async () => {
      const fixture = createFixture('apps');
      const component = fixture.componentInstance;

      component.form.controls.title.setValue('My app');
      component.form.controls.shortDescription.setValue('Useful');
      component.form.controls.videoUrl.setValue('https://example.com/video.mp4');
      fixture.detectChanges();
      buttons(fixture).save.click();
      await settle();

      const updated = service.resources()[0] as AppResource;
      expect(updated.videoUrl).toBe('https://example.com/video.mp4');
    });

    it('omits the video link from the persisted payload for multimedia', async () => {
      const fixture = createFixture('multimedia');
      const component = fixture.componentInstance;

      component.form.controls.title.setValue('Doc');
      component.form.controls.shortDescription.setValue('A documentary');
      component.form.controls.categoryFields.setValue({
        mediaType: 'documentary',
        externalUrl: 'https://example.com/watch',
      });
      fixture.detectChanges();
      buttons(fixture).save.click();
      await settle();

      const updated = service.resources()[0] as unknown as Record<string, unknown>;
      expect(updated['videoUrl']).toBeUndefined();
    });
  });

  describe('dynamic title', () => {
    it.each([
      ['nutrition', 'Nutrition'],
      ['recipes', 'Recipes'],
      ['multimedia', 'Multimedia'],
      ['apps', 'Apps'],
    ] as const)('shows the %s category label when creating', (category, label) => {
      const fixture = createFixture(category);

      expect(fixture.nativeElement.querySelector('h2').textContent).toContain(label);
      expect(fixture.nativeElement.querySelector('h2').textContent).toContain(
        language.t().resources.resourceForm.newHeading(label),
      );
    });

    it('shows the category label when editing an existing resource', () => {
      const created = makeResource({
        category: 'apps',
        slug: 'my-app',
        images: [],
        translations: { en: { title: 'My app', shortDescription: 'Useful' } },
      } as unknown as Partial<Resource>);
      service.seed([created]);
      const fixture = TestBed.createComponent(ResourceFormDrawer);
      fixture.componentRef.setInput('resource', created);
      fixture.componentRef.setInput('category', 'apps');
      fixture.componentRef.setInput('targetLanguage', 'en');
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('h2').textContent).toContain(
        language.t().resources.resourceForm.editHeading('Apps'),
      );
    });
  });

  describe('character limits', () => {
    it('caps the title input and shows how many characters remain', () => {
      const fixture = createFixture('nutrition');
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

    it('caps the short description input and shows how many characters remain', () => {
      const fixture = createFixture('nutrition');
      const textarea = fixture.nativeElement.querySelector(
        'textarea[formcontrolname="shortDescription"]',
      ) as HTMLTextAreaElement;
      expect(textarea.maxLength).toBe(SHORT_DESCRIPTION_MAX_LENGTH);

      fixture.componentInstance.form.controls.shortDescription.setValue('Hello');
      fixture.detectChanges();

      expect(fixture.nativeElement.textContent).toContain(
        language.t().fieldLimits.charactersRemaining(SHORT_DESCRIPTION_MAX_LENGTH - 5),
      );
    });
  });

  describe('slug', () => {
    it('auto-suggests a slug from the title until manually edited', () => {
      const fixture = createFixture();
      const component = fixture.componentInstance;

      component.form.controls.title.setValue('Omega 3 Basics');
      fixture.detectChanges();
      expect(component.form.controls.slug.value).toBe('omega-3-basics');
    });

    it('blocks submission with a duplicate slug across any category', () => {
      service.seed([
        makeResource({
          category: 'apps',
          slug: 'existing-resource',
          images: [],
          translations: { en: { title: 'An app', shortDescription: 'Useful' } },
        } as unknown as Partial<Resource>),
      ]);
      const fixture = createFixture('nutrition');
      const component = fixture.componentInstance;

      component.form.controls.title.setValue('Something');
      component.form.controls.shortDescription.setValue('Desc');
      component.form.controls.slug.setValue('existing-resource');
      fixture.detectChanges();

      expect(component.form.controls.slug.hasError('duplicateSlug')).toBe(true);
      expect(buttons(fixture).save.disabled).toBe(true);
    });
  });

  describe('AI-suggested translation', () => {
    function nutritionResource() {
      const resource = makeResource({
        category: 'nutrition',
        slug: 'omega-3',
        sourceLinks: [],
        pdfUrls: [],
        images: [],
        translations: {
          en: { title: 'Omega 3', shortDescription: 'Good fats' },
        },
      } as Partial<Resource>);
      service.seed([resource]);
      return resource;
    }

    it('requests a suggestion when adding a new language and pre-fills on success', async () => {
      let resolveSuggest!: (value: Record<string, unknown>) => void;
      suggestionService.suggest.mockReturnValue(
        new Promise((resolve) => {
          resolveSuggest = resolve;
        }),
      );
      const existing = nutritionResource();
      const fixture = TestBed.createComponent(ResourceFormDrawer);
      fixture.componentRef.setInput('resource', existing);
      fixture.componentRef.setInput('category', 'nutrition');
      fixture.componentRef.setInput('targetLanguage', 'es');
      fixture.componentRef.setInput('sourceLanguage', 'en');
      fixture.detectChanges();

      expect(suggestionService.suggest).toHaveBeenCalledWith(
        {
          language: 'en',
          fields: { title: 'Omega 3', shortDescription: 'Good fats' },
        },
        'es',
      );
      expect(fixture.componentInstance.loading()).toBe(true);

      resolveSuggest({
        title: 'Omega 3 es',
        shortDescription: 'Buenas grasas',
      });
      await settle();
      fixture.detectChanges();

      expect(fixture.componentInstance.loading()).toBe(false);
      expect(fixture.componentInstance.form.controls.title.value).toBe('Omega 3 es');
    });

    it('does not request a suggestion when editing an already-translated language', () => {
      const existing = nutritionResource();
      const fixture = TestBed.createComponent(ResourceFormDrawer);
      fixture.componentRef.setInput('resource', existing);
      fixture.componentRef.setInput('category', 'nutrition');
      fixture.componentRef.setInput('targetLanguage', 'en');
      fixture.detectChanges();

      expect(suggestionService.suggest).not.toHaveBeenCalled();
    });
  });

  it('shows the working-language indicator', () => {
    language.setLanguage('es');
    const fixture = createFixture('nutrition', 'es');

    expect(fixture.nativeElement.textContent).toContain(
      language.t().resources.resourceForm.workingLanguageLabel('Español'),
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

    expect(service.resources()).toHaveLength(0);
    expect(cancelled).toBe(true);
  });
});

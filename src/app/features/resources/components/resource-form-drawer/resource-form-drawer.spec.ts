import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ResourceFormDrawer } from './resource-form-drawer';
import { ResourceService } from '../../services/resource.service';
import { TranslationSuggestionService } from '../../../../shared/services/translation-suggestion.service';
import { LanguageService } from '../../../../core/i18n/language.service';
import { RecipeResource } from '../../models/resource.model';

describe('ResourceFormDrawer', () => {
  let service: ResourceService;
  let language: LanguageService;
  let suggestionService: { suggest: ReturnType<typeof vi.fn> };
  let snackBarOpen: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    localStorage.clear();
    suggestionService = { suggest: vi.fn() };
    snackBarOpen = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        provideNoopAnimations(),
        { provide: TranslationSuggestionService, useValue: suggestionService },
        { provide: MatSnackBar, useValue: { open: snackBarOpen } },
      ],
    });
    service = TestBed.inject(ResourceService);
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

  it('creates a draft resource of the locked category on Save', () => {
    const fixture = createFixture('nutrition');
    const component = fixture.componentInstance;
    let saved = false;
    component.saved.subscribe(() => (saved = true));

    component.form.controls.title.setValue('Omega 3');
    component.form.controls.shortDescription.setValue('Good fats');
    fixture.detectChanges();
    buttons(fixture).save.click();

    expect(service.resources()).toHaveLength(1);
    expect(service.resources()[0].category).toBe('nutrition');
    expect(service.resources()[0].status).toBe('draft');
    expect(service.resources()[0].translations.en?.title).toBe('Omega 3');
    expect(saved).toBe(true);
  });

  it('creates and publishes on Publish for a new resource', () => {
    const fixture = createFixture('nutrition');
    const component = fixture.componentInstance;

    component.form.controls.title.setValue('Omega 3');
    component.form.controls.shortDescription.setValue('Good fats');
    fixture.detectChanges();
    buttons(fixture).publish?.click();

    expect(service.resources()[0].status).toBe('published');
  });

  it('hides the Publish button when editing an existing resource', () => {
    const created = service.create({
      category: 'nutrition',
      slug: 'omega-3',
      sharedFields: { sourceLinks: [], pdfUrls: [] },
      language: 'en',
      translation: { title: 'Omega 3', shortDescription: 'Good fats', explanatoryText: '' },
    });
    const fixture = TestBed.createComponent(ResourceFormDrawer);
    fixture.componentRef.setInput('resource', created);
    fixture.componentRef.setInput('category', 'nutrition');
    fixture.componentRef.setInput('targetLanguage', 'en');
    fixture.detectChanges();

    expect(buttons(fixture).publish).toBeNull();
  });

  it('splits shared vs. translated fields correctly for a recipe on save', () => {
    const created = service.create({
      category: 'recipes',
      slug: 'soup',
      sharedFields: { preparationMinutes: 10, photoUrls: [] },
      language: 'en',
      translation: { title: 'Soup', shortDescription: 'Warm', ingredients: ['Water'], steps: ['Boil'] },
    });
    const fixture = TestBed.createComponent(ResourceFormDrawer);
    fixture.componentRef.setInput('resource', created);
    fixture.componentRef.setInput('category', 'recipes');
    fixture.componentRef.setInput('targetLanguage', 'en');
    fixture.detectChanges();
    const component = fixture.componentInstance;

    component.form.controls.categoryFields.setValue({
      preparationMinutes: 20,
      photoUrls: ['https://example.com/soup.png'],
      ingredients: ['Water', 'Salt'],
      steps: ['Boil', 'Season'],
    });
    fixture.detectChanges();
    buttons(fixture).save.click();

    const updated = service.resources()[0] as RecipeResource;
    expect(updated.preparationMinutes).toBe(20);
    expect(updated.photoUrls).toEqual(['https://example.com/soup.png']);
    expect(updated.translations.en?.ingredients).toEqual(['Water', 'Salt']);
    expect(updated.translations.en?.steps).toEqual(['Boil', 'Season']);
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
      service.create({
        category: 'apps',
        slug: 'existing-resource',
        sharedFields: { iconUrl: '' },
        language: 'en',
        translation: { title: 'An app', shortDescription: 'Useful' },
      });
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
    it('requests a suggestion when adding a new language and pre-fills on success', async () => {
      let resolveSuggest!: (value: Record<string, unknown>) => void;
      suggestionService.suggest.mockReturnValue(
        new Promise((resolve) => {
          resolveSuggest = resolve;
        }),
      );
      const existing = service.create({
        category: 'nutrition',
        slug: 'omega-3',
        sharedFields: { sourceLinks: [], pdfUrls: [] },
        language: 'en',
        translation: { title: 'Omega 3', shortDescription: 'Good fats', explanatoryText: 'Details' },
      });
      const fixture = TestBed.createComponent(ResourceFormDrawer);
      fixture.componentRef.setInput('resource', existing);
      fixture.componentRef.setInput('category', 'nutrition');
      fixture.componentRef.setInput('targetLanguage', 'es');
      fixture.componentRef.setInput('sourceLanguage', 'en');
      fixture.detectChanges();

      expect(suggestionService.suggest).toHaveBeenCalledWith(
        {
          language: 'en',
          fields: { title: 'Omega 3', shortDescription: 'Good fats', explanatoryText: 'Details' },
        },
        'es',
      );
      expect(fixture.componentInstance.loading()).toBe(true);

      resolveSuggest({
        title: 'Omega 3 es',
        shortDescription: 'Buenas grasas',
        explanatoryText: 'Detalles',
      });
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
      fixture.detectChanges();

      expect(fixture.componentInstance.loading()).toBe(false);
      expect(fixture.componentInstance.form.controls.title.value).toBe('Omega 3 es');
    });

    it('does not request a suggestion when editing an already-translated language', () => {
      const existing = service.create({
        category: 'nutrition',
        slug: 'omega-3',
        sharedFields: { sourceLinks: [], pdfUrls: [] },
        language: 'en',
        translation: { title: 'Omega 3', shortDescription: 'Good fats', explanatoryText: 'Details' },
      });
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

import { TestBed } from '@angular/core/testing';
import { CdkDragDrop, CdkDropList } from '@angular/cdk/drag-drop';
import { ResourcesListPage } from './resources-list.page';
import { ResourceService } from '../../services/resource.service';
import { TranslationSuggestionService } from '../../../../shared/services/translation-suggestion.service';
import { LanguageService } from '../../../../core/i18n/language.service';
import { Resource } from '../../models/resource.model';

describe('ResourcesListPage', () => {
  let service: ResourceService;
  let language: LanguageService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        { provide: TranslationSuggestionService, useValue: { suggest: vi.fn(() => new Promise(() => {})) } },
      ],
    });
    service = TestBed.inject(ResourceService);
    language = TestBed.inject(LanguageService);
  });

  function createFixture() {
    const fixture = TestBed.createComponent(ResourcesListPage);
    fixture.detectChanges();
    return fixture;
  }

  function createResource(category: 'nutrition' | 'recipes' | 'multimedia' | 'apps', slug: string) {
    switch (category) {
      case 'nutrition':
        return service.create({
          category,
          slug,
          sharedFields: { sourceLinks: [], pdfUrls: [] },
          language: 'en',
          translation: { title: slug, shortDescription: '', explanatoryText: '' },
        });
      case 'recipes':
        return service.create({
          category,
          slug,
          sharedFields: { preparationMinutes: 10, photoUrls: [] },
          language: 'en',
          translation: { title: slug, shortDescription: '', ingredients: [], steps: [] },
        });
      case 'multimedia':
        return service.create({
          category,
          slug,
          sharedFields: { mediaType: 'podcast', externalUrl: 'https://example.com', posterUrl: '' },
          language: 'en',
          translation: { title: slug, shortDescription: '' },
        });
      case 'apps':
        return service.create({
          category,
          slug,
          sharedFields: { iconUrl: '' },
          language: 'en',
          translation: { title: slug, shortDescription: '' },
        });
    }
  }

  it('shows an empty-category state for each category with no resources', () => {
    const fixture = createFixture();

    expect(
      fixture.nativeElement.querySelectorAll('[data-testid^="empty-category-"]').length,
    ).toBe(4);
  });

  it('groups resources into their category section', () => {
    createResource('nutrition', 'omega-3');
    createResource('recipes', 'soup');
    const fixture = createFixture();

    expect(
      fixture.nativeElement.querySelector('[data-testid="category-section-nutrition"]')?.textContent,
    ).toContain('omega-3');
    expect(
      fixture.nativeElement.querySelector('[data-testid="category-section-recipes"]')?.textContent,
    ).toContain('soup');
  });

  it('filters to a single category when a filter option is selected', () => {
    createResource('nutrition', 'omega-3');
    createResource('recipes', 'soup');
    const fixture = createFixture();

    fixture.componentInstance['activeFilter'].set('nutrition');
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[data-testid="category-section-nutrition"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('[data-testid="category-section-recipes"]')).toBeNull();
  });

  it('opens the drawer with the category locked when an "add" button is clicked', () => {
    const fixture = createFixture();

    (
      fixture.nativeElement.querySelector('[data-testid="add-nutrition-button"]') as HTMLButtonElement
    ).click();
    fixture.detectChanges();

    const drawer = fixture.nativeElement.querySelector('app-resource-form-drawer');
    expect(drawer).not.toBeNull();
    expect(fixture.componentInstance['drawerContext']()).toEqual({ mode: 'create', category: 'nutrition' });
  });

  it('reorders resources within a category via drag-and-drop without touching other categories', () => {
    const a = createResource('nutrition', 'a');
    const b = createResource('nutrition', 'b');
    const c = createResource('nutrition', 'c');
    const recipe = createResource('recipes', 'a-recipe');
    const fixture = createFixture();

    const event = {
      previousIndex: 0,
      currentIndex: 2,
      container: { data: [a, b, c] as Resource[] },
    } as unknown as CdkDragDrop<Resource[]>;
    fixture.componentInstance.onDrop('nutrition', event);

    const bySlug = new Map(service.resources().map((r) => [r.slug, r.order]));
    expect(bySlug.get('b')).toBe(0);
    expect(bySlug.get('c')).toBe(1);
    expect(bySlug.get('a')).toBe(2);
    expect(bySlug.get(recipe.slug)).toBe(0);
  });

  it('closes the drawer when the form emits saved', () => {
    const fixture = createFixture();
    (
      fixture.nativeElement.querySelector('[data-testid="add-nutrition-button"]') as HTMLButtonElement
    ).click();
    fixture.detectChanges();

    fixture.componentInstance['onSaved']();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('app-resource-form-drawer')).toBeNull();
  });
});

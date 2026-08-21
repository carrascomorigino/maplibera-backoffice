import { TestBed } from '@angular/core/testing';
import { CdkDragDrop, CdkDropList } from '@angular/cdk/drag-drop';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of } from 'rxjs';
import { ResourcesListPage } from './resources-list.page';
import { ResourceService } from '../../services/resource.service';
import { TranslationSuggestionService } from '../../../../shared/services/translation-suggestion.service';
import { LanguageService } from '../../../../core/i18n/language.service';
import { Resource, ResourceCategory } from '../../models/resource.model';
import { FakeResourceService, makeResource } from '../../testing/fake-resource-service';

describe('ResourcesListPage', () => {
  let service: FakeResourceService;

  beforeEach(() => {
    service = new FakeResourceService();
    TestBed.configureTestingModule({
      providers: [
        { provide: ResourceService, useValue: service },
        { provide: TranslationSuggestionService, useValue: { suggest: vi.fn(() => new Promise(() => {})) } },
        { provide: MatSnackBar, useValue: { open: vi.fn() } },
      ],
    });
    TestBed.inject(LanguageService);
  });

  function createFixture() {
    const fixture = TestBed.createComponent(ResourcesListPage);
    fixture.detectChanges();
    return fixture;
  }

  function resourceFixture(category: ResourceCategory, slug: string, order = 0): Resource {
    const sharedFields: Record<string, unknown> = {
      nutrition: { sourceLinks: [], pdfUrls: [] },
      recipes: { preparationMinutes: 10, photoUrls: [] },
      multimedia: { mediaType: 'podcast', externalUrl: 'https://example.com', posterUrl: '' },
      apps: { iconUrl: '' },
    }[category]!;
    return makeResource({
      category,
      slug,
      order,
      translations: { en: { title: slug, shortDescription: '' } },
      ...sharedFields,
    } as Partial<Resource>);
  }

  it('shows an empty-category state for each category with no resources', () => {
    const fixture = createFixture();

    expect(
      fixture.nativeElement.querySelectorAll('[data-testid^="empty-category-"]').length,
    ).toBe(4);
  });

  it('groups resources into their category section', () => {
    service.seed([resourceFixture('nutrition', 'omega-3'), resourceFixture('recipes', 'soup')]);
    const fixture = createFixture();

    expect(
      fixture.nativeElement.querySelector('[data-testid="category-section-nutrition"]')?.textContent,
    ).toContain('omega-3');
    expect(
      fixture.nativeElement.querySelector('[data-testid="category-section-recipes"]')?.textContent,
    ).toContain('soup');
  });

  it('filters to a single category when a filter option is selected', () => {
    service.seed([resourceFixture('nutrition', 'omega-3'), resourceFixture('recipes', 'soup')]);
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

  it('reorders resources within a category via drag-and-drop without touching other categories', async () => {
    const a = resourceFixture('nutrition', 'a', 0);
    const b = resourceFixture('nutrition', 'b', 1);
    const c = resourceFixture('nutrition', 'c', 2);
    const recipe = resourceFixture('recipes', 'a-recipe', 0);
    service.seed([a, b, c, recipe]);
    const fixture = createFixture();

    const event = {
      previousIndex: 0,
      currentIndex: 2,
      container: { data: [a, b, c] as Resource[] },
    } as unknown as CdkDragDrop<Resource[]>;
    fixture.componentInstance.onDrop('nutrition', event);
    await Promise.resolve();
    await Promise.resolve();

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

  describe('bulk selection', () => {
    it('deletes the selected resources via the service after confirming', async () => {
      const a = resourceFixture('nutrition', 'a');
      service.seed([a]);
      const fixture = createFixture();
      const dialog = TestBed.inject(MatDialog);
      vi.spyOn(dialog, 'open').mockReturnValue({ afterClosed: () => of(true) } as ReturnType<MatDialog['open']>);

      fixture.componentInstance['toggleSelection'](a.id);
      fixture.componentInstance['requestBulkDelete']();
      await Promise.resolve();
      await Promise.resolve();

      expect(service.delete).toHaveBeenCalledWith(a.id);
      expect(fixture.componentInstance['selectedCount']()).toBe(0);
    });

    it('does not delete when the confirm dialog is cancelled', () => {
      const a = resourceFixture('nutrition', 'a');
      service.seed([a]);
      const fixture = createFixture();
      const dialog = TestBed.inject(MatDialog);
      vi.spyOn(dialog, 'open').mockReturnValue({ afterClosed: () => of(false) } as ReturnType<MatDialog['open']>);

      fixture.componentInstance['toggleSelection'](a.id);
      fixture.componentInstance['requestBulkDelete']();

      expect(service.delete).not.toHaveBeenCalled();
    });
  });
});

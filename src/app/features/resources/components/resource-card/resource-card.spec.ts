import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { of } from 'rxjs';
import { ResourceCard } from './resource-card';
import { ResourceService } from '../../services/resource.service';
import { LanguageService } from '../../../../core/i18n/language.service';
import { Resource } from '../../models/resource.model';

describe('ResourceCard', () => {
  let service: ResourceService;
  let language: LanguageService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    service = TestBed.inject(ResourceService);
    language = TestBed.inject(LanguageService);
  });

  function createFixture(resource: Resource) {
    const fixture = TestBed.createComponent(ResourceCard);
    fixture.componentRef.setInput('resource', resource);
    fixture.detectChanges();
    return fixture;
  }

  function nutritionResource(): Resource {
    return service.create({
      category: 'nutrition',
      slug: 'omega-3',
      sharedFields: { sourceLinks: [], pdfUrls: [] },
      language: 'en',
      translation: { title: 'Omega 3', shortDescription: 'Good fats', explanatoryText: '' },
    });
  }

  function recipeResource(): Resource {
    return service.create({
      category: 'recipes',
      slug: 'soup',
      sharedFields: { preparationMinutes: 10, photoUrls: ['https://example.com/soup.png'] },
      language: 'en',
      translation: { title: 'Soup', shortDescription: 'Warm', ingredients: [], steps: [] },
    });
  }

  it('shows a category icon placeholder for nutrition (no image field)', () => {
    const fixture = createFixture(nutritionResource());

    expect(fixture.nativeElement.querySelector('[data-testid="thumbnail-placeholder"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('img')).toBeNull();
  });

  it('shows the first gallery photo as the thumbnail for a recipe', () => {
    const fixture = createFixture(recipeResource());

    const img = fixture.nativeElement.querySelector('img') as HTMLImageElement;
    expect(img).not.toBeNull();
    expect(img.src).toBe('https://example.com/soup.png');
  });

  it('shows the status badge', () => {
    const fixture = createFixture(nutritionResource());

    expect(fixture.nativeElement.querySelector('[data-testid="status-badge"]')?.textContent?.trim()).toBe(
      'draft',
    );
  });

  it('toggles publish/pause via the service', () => {
    const resource = nutritionResource();
    const fixture = createFixture(resource);

    (fixture.nativeElement.querySelector(
      `[data-testid="status-action-${resource.slug}"]`,
    ) as HTMLButtonElement).click();

    expect(service.resources()[0].status).toBe('published');
  });

  it('shows a drag handle', () => {
    const fixture = createFixture(nutritionResource());

    expect(fixture.nativeElement.querySelector('[data-testid="drag-handle"]')).not.toBeNull();
  });

  it('emits editRequested when the edit button is clicked', () => {
    const resource = nutritionResource();
    const fixture = createFixture(resource);
    const editRequested = vi.fn();
    fixture.componentInstance.editRequested.subscribe(editRequested);

    (fixture.nativeElement.querySelector('[data-testid="edit-button"]') as HTMLButtonElement).click();

    expect(editRequested).toHaveBeenCalledWith({
      resource,
      targetLanguage: 'en',
      staleSourceLanguage: undefined,
    });
  });

  it('removes a translation via the confirm dialog, same as guide', () => {
    const created = nutritionResource();
    service.saveTranslation(created.slug, 'es', {
      title: 'Omega 3 es',
      shortDescription: 'Buenas grasas',
      explanatoryText: '',
    });
    const resource = service.resources()[0];
    const fixture = createFixture(resource);
    const dialog = TestBed.inject(MatDialog);
    vi.spyOn(dialog, 'open').mockReturnValue({ afterClosed: () => of(true) } as ReturnType<MatDialog['open']>);

    fixture.componentInstance['onLanguageRemoved']('es');

    expect(service.resources()[0].translations.es).toBeUndefined();
  });
});

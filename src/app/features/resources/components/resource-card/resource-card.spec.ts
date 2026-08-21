import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of } from 'rxjs';
import { ResourceCard } from './resource-card';
import { ResourceService } from '../../services/resource.service';
import { LanguageService } from '../../../../core/i18n/language.service';
import { Resource } from '../../models/resource.model';
import { FakeResourceService, makeResource } from '../../testing/fake-resource-service';

describe('ResourceCard', () => {
  let service: FakeResourceService;
  let language: LanguageService;
  let snackBarOpen: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    service = new FakeResourceService();
    snackBarOpen = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        { provide: ResourceService, useValue: service },
        { provide: MatSnackBar, useValue: { open: snackBarOpen } },
      ],
    });
    language = TestBed.inject(LanguageService);
  });

  function createFixture(resource: Resource) {
    const fixture = TestBed.createComponent(ResourceCard);
    fixture.componentRef.setInput('resource', resource);
    fixture.detectChanges();
    return fixture;
  }

  function nutritionResource(): Resource {
    return makeResource({
      category: 'nutrition',
      slug: 'omega-3',
      sourceLinks: [],
      pdfUrls: [],
      translations: { en: { title: 'Omega 3', shortDescription: 'Good fats', explanatoryText: '' } },
    } as Partial<Resource>);
  }

  function recipeResource(): Resource {
    return makeResource({
      category: 'recipes',
      slug: 'soup',
      preparationMinutes: 10,
      photoUrls: ['https://example.com/soup.png'],
      translations: { en: { title: 'Soup', shortDescription: 'Warm', ingredients: [], steps: [] } },
    } as unknown as Partial<Resource>);
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

  it('toggles publish/pause via the service', async () => {
    const resource = nutritionResource();
    const fixture = createFixture(resource);

    (fixture.nativeElement.querySelector(
      `[data-testid="status-action-${resource.slug}"]`,
    ) as HTMLButtonElement).click();
    await Promise.resolve();

    expect(service.publish).toHaveBeenCalledWith(resource.id);
  });

  it('shows an error notice when the status action fails', async () => {
    service.publish.mockRejectedValueOnce(new Error('network error'));
    const resource = nutritionResource();
    const fixture = createFixture(resource);

    (fixture.nativeElement.querySelector(
      `[data-testid="status-action-${resource.slug}"]`,
    ) as HTMLButtonElement).click();
    await Promise.resolve();
    await Promise.resolve();

    expect(snackBarOpen).toHaveBeenCalled();
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

  it('removes a translation via the confirm dialog, same as guide', async () => {
    const resource = nutritionResource();
    const fixture = createFixture(resource);
    const dialog = TestBed.inject(MatDialog);
    vi.spyOn(dialog, 'open').mockReturnValue({ afterClosed: () => of(true) } as ReturnType<MatDialog['open']>);

    fixture.componentInstance['onLanguageRemoved']('es');
    await Promise.resolve();

    expect(service.removeTranslation).toHaveBeenCalledWith(resource.id, 'es');
  });

  it('emits selectionToggled when the checkbox is toggled', () => {
    const resource = nutritionResource();
    const fixture = createFixture(resource);
    const selectionToggled = vi.fn();
    fixture.componentInstance.selectionToggled.subscribe(selectionToggled);

    (
      fixture.nativeElement.querySelector('[data-testid="select-checkbox"] input') as HTMLInputElement
    ).click();

    expect(selectionToggled).toHaveBeenCalled();
  });
});

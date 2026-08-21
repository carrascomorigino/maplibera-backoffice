import { Component } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { TestBed } from '@angular/core/testing';
import { ImageGalleryInput } from './image-gallery-input';
import { GalleryImageValue } from '../../models/gallery-image-value.model';
import { LanguageService } from '../../../core/i18n/language.service';

@Component({
  selector: 'app-host',
  imports: [ReactiveFormsModule, ImageGalleryInput],
  template: `<app-image-gallery-input
    [formControl]="control"
    [imageRowLabel]="'Photo'"
    [addButtonLabel]="'Add photo'"
    [descriptionLabel]="'Description'"
    [descriptionMaxLength]="descriptionMaxLength"
    [maxImages]="maxImages"
  />`,
})
class HostComponent {
  control = new FormControl<GalleryImageValue[]>([], { nonNullable: true });
  descriptionMaxLength: number | undefined = undefined;
  maxImages = 3;
}

describe('ImageGalleryInput', () => {
  let language: LanguageService;

  function createFixture(initial: GalleryImageValue[] = [], maxImages = 3) {
    TestBed.configureTestingModule({ imports: [HostComponent] });
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.maxImages = maxImages;
    fixture.componentInstance.control.setValue(initial);
    fixture.detectChanges();
    language = TestBed.inject(LanguageService);
    return fixture;
  }

  function rows(fixture: ReturnType<typeof createFixture>) {
    return Array.from(
      fixture.nativeElement.querySelectorAll('[data-testid="gallery-row"]'),
    ) as HTMLElement[];
  }

  function nestedUrlInput(row: HTMLElement) {
    return row.querySelector('[data-testid="image-input-url-field"]') as HTMLInputElement;
  }

  function descriptionInput(row: HTMLElement) {
    return row.querySelector('[data-testid="gallery-description-input"]') as HTMLTextAreaElement;
  }

  function addButton(fixture: ReturnType<typeof createFixture>) {
    return fixture.nativeElement.querySelector('[data-testid="gallery-add-button"]') as HTMLButtonElement;
  }

  function removeButton(fixture: ReturnType<typeof createFixture>, index: number) {
    return fixture.nativeElement.querySelectorAll('[data-testid="gallery-remove-button"]')[
      index
    ] as HTMLButtonElement;
  }

  it('renders one row per initial value, with its image and description', () => {
    const fixture = createFixture([
      { image: { kind: 'url', url: 'https://example.com/a.jpg' }, description: 'First photo' },
      { image: { kind: 'url', url: 'https://example.com/b.jpg' } },
    ]);

    const rendered = rows(fixture);
    expect(rendered).toHaveLength(2);
    expect(nestedUrlInput(rendered[0]).value).toBe('https://example.com/a.jpg');
    expect(descriptionInput(rendered[0]).value).toBe('First photo');
    expect(nestedUrlInput(rendered[1]).value).toBe('https://example.com/b.jpg');
    expect(descriptionInput(rendered[1]).value).toBe('');
  });

  it('adds a new empty row when the add button is clicked', () => {
    const fixture = createFixture([{ image: { kind: 'url', url: 'https://example.com/a.jpg' } }]);

    addButton(fixture).click();
    fixture.detectChanges();

    expect(rows(fixture)).toHaveLength(2);
  });

  it('disables the add button once the row count reaches maxImages', () => {
    const fixture = createFixture(
      [
        { image: { kind: 'url', url: 'https://example.com/a.jpg' } },
        { image: { kind: 'url', url: 'https://example.com/b.jpg' } },
      ],
      2,
    );

    expect(addButton(fixture).disabled).toBe(true);
  });

  it('removes a row when its remove button is clicked', () => {
    const fixture = createFixture([
      { image: { kind: 'url', url: 'https://example.com/a.jpg' } },
      { image: { kind: 'url', url: 'https://example.com/b.jpg' } },
    ]);

    removeButton(fixture, 0).click();
    fixture.detectChanges();

    expect(rows(fixture)).toHaveLength(1);
    expect(nestedUrlInput(rows(fixture)[0]).value).toBe('https://example.com/b.jpg');
  });

  it('filters out rows without a resolved image from the emitted value', () => {
    const fixture = createFixture([{ image: { kind: 'url', url: 'https://example.com/a.jpg' } }]);

    addButton(fixture).click();
    fixture.detectChanges();

    expect(rows(fixture)).toHaveLength(2);
    expect(fixture.componentInstance.control.value).toEqual([
      { image: { kind: 'url', url: 'https://example.com/a.jpg' } },
    ]);

    const secondRow = rows(fixture)[1];
    const urlInput = nestedUrlInput(secondRow);
    urlInput.value = 'https://example.com/b.jpg';
    urlInput.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(fixture.componentInstance.control.value).toEqual([
      { image: { kind: 'url', url: 'https://example.com/a.jpg' } },
      { image: { kind: 'url', url: 'https://example.com/b.jpg' } },
    ]);
  });

  it('includes a trimmed description alongside the image in the emitted value', () => {
    const fixture = createFixture([{ image: { kind: 'url', url: 'https://example.com/a.jpg' } }]);

    const descInput = descriptionInput(rows(fixture)[0]);
    descInput.value = '  A lovely photo  ';
    descInput.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(fixture.componentInstance.control.value).toEqual([
      { image: { kind: 'url', url: 'https://example.com/a.jpg' }, description: 'A lovely photo' },
    ]);
  });

  it('propagates a nested ImageInput validation error up to the gallery control', () => {
    const fixture = createFixture([{ image: { kind: 'url', url: 'not-a-url' } }]);

    expect(fixture.componentInstance.control.valid).toBe(false);
  });

  it('shows a live image count indicator', () => {
    const fixture = createFixture([{ image: { kind: 'url', url: 'https://example.com/a.jpg' } }], 3);

    expect(fixture.nativeElement.textContent).toContain(language.t().imageGalleryInput.imageCountLabel(1, 3));

    addButton(fixture).click();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain(language.t().imageGalleryInput.imageCountLabel(2, 3));
  });

  describe('description character limit', () => {
    it('does not cap the description or show a hint when descriptionMaxLength is unset', () => {
      const fixture = createFixture([{ image: { kind: 'url', url: 'https://example.com/a.jpg' } }]);

      const textarea = descriptionInput(rows(fixture)[0]);
      expect(textarea.hasAttribute('maxlength')).toBe(false);
      expect(fixture.nativeElement.querySelector('mat-hint')).toBeNull();
    });

    it('caps the description and shows how many characters remain when set', () => {
      TestBed.configureTestingModule({ imports: [HostComponent] });
      const fixture = TestBed.createComponent(HostComponent);
      fixture.componentInstance.descriptionMaxLength = 150;
      fixture.componentInstance.control.setValue([
        { image: { kind: 'url', url: 'https://example.com/a.jpg' }, description: 'Hello' },
      ]);
      fixture.detectChanges();
      language = TestBed.inject(LanguageService);

      const textarea = descriptionInput(rows(fixture)[0]);
      expect(textarea.maxLength).toBe(150);
      expect(fixture.nativeElement.textContent).toContain(
        language.t().fieldLimits.charactersRemaining(150 - 'Hello'.length),
      );
    });
  });
});

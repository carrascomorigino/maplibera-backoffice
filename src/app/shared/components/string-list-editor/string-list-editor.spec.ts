import { Component } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { TestBed } from '@angular/core/testing';
import { StringListEditor } from './string-list-editor';
import { ImageValue } from '../../models/image-value.model';
import { LanguageService } from '../../../core/i18n/language.service';

@Component({
  selector: 'app-host',
  imports: [ReactiveFormsModule, StringListEditor],
  template: `<app-string-list-editor
    [formControl]="control"
    [addButtonLabel]="'Add item'"
    [urlMode]="urlMode"
    [rowMaxLength]="rowMaxLength"
  />`,
})
class HostComponent {
  control = new FormControl<string[]>([], { nonNullable: true });
  urlMode = false;
  rowMaxLength: number | undefined = undefined;
}

@Component({
  selector: 'app-image-host',
  imports: [ReactiveFormsModule, StringListEditor],
  template: `<app-string-list-editor
    [formControl]="control"
    [addButtonLabel]="'Add photo'"
    [imageMode]="true"
    [imageRowLabel]="'Photo'"
    [rowMaxLength]="rowMaxLength"
  />`,
})
class ImageHostComponent {
  control = new FormControl<ImageValue[]>([], { nonNullable: true });
  rowMaxLength: number | undefined = undefined;
}

describe('StringListEditor', () => {
  function createFixture(initial: string[] = [], urlMode = false, rowMaxLength?: number) {
    TestBed.configureTestingModule({ imports: [HostComponent] });
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.control.setValue(initial);
    fixture.componentInstance.urlMode = urlMode;
    fixture.componentInstance.rowMaxLength = rowMaxLength;
    fixture.detectChanges();
    return fixture;
  }

  function createImageFixture(initial: ImageValue[] = [], rowMaxLength?: number) {
    TestBed.configureTestingModule({ imports: [ImageHostComponent] });
    const fixture = TestBed.createComponent(ImageHostComponent);
    fixture.componentInstance.control.setValue(initial);
    fixture.componentInstance.rowMaxLength = rowMaxLength;
    fixture.detectChanges();
    return fixture;
  }

  function rows(fixture: ReturnType<typeof createFixture>) {
    return Array.from(
      fixture.nativeElement.querySelectorAll('[data-testid="string-list-row-input"]'),
    ) as HTMLInputElement[];
  }

  function addButton(fixture: ReturnType<typeof createFixture> | ReturnType<typeof createImageFixture>) {
    return fixture.nativeElement.querySelector('[data-testid="string-list-add-button"]') as HTMLButtonElement;
  }

  function removeButton(
    fixture: ReturnType<typeof createFixture> | ReturnType<typeof createImageFixture>,
    index: number,
  ) {
    return fixture.nativeElement.querySelectorAll(
      '[data-testid="string-list-remove-button"]',
    )[index] as HTMLButtonElement;
  }

  it('renders one row per initial value', () => {
    const fixture = createFixture(['Flour', 'Sugar']);

    expect(rows(fixture)).toHaveLength(2);
    expect(rows(fixture)[0].value).toBe('Flour');
    expect(rows(fixture)[1].value).toBe('Sugar');
  });

  it('adds a new empty row when the add button is clicked', () => {
    const fixture = createFixture(['Flour']);

    addButton(fixture).click();
    fixture.detectChanges();

    expect(rows(fixture)).toHaveLength(2);
  });

  it('removes a row when its remove button is clicked', () => {
    const fixture = createFixture(['Flour', 'Sugar']);

    removeButton(fixture, 0).click();
    fixture.detectChanges();

    expect(rows(fixture)).toHaveLength(1);
    expect(rows(fixture)[0].value).toBe('Sugar');
  });

  it('filters out empty/whitespace rows from the emitted value', () => {
    const fixture = createFixture(['Flour']);
    addButton(fixture).click();
    fixture.detectChanges();
    const inputs = rows(fixture);
    inputs[1].value = '   ';
    inputs[1].dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(fixture.componentInstance.control.value).toEqual(['Flour']);
  });

  it('does not flag a row invalid in default (non-URL) mode', () => {
    const fixture = createFixture(['not a url'], false);

    expect(fixture.componentInstance.control.valid).toBe(true);
  });

  it('flags a row invalid in URL mode when it is not a valid URL', () => {
    const fixture = createFixture(['not-a-url'], true);

    expect(fixture.componentInstance.control.valid).toBe(false);
  });

  it('accepts a valid URL in URL mode', () => {
    const fixture = createFixture(['https://example.com/a.pdf'], true);

    expect(fixture.componentInstance.control.valid).toBe(true);
  });

  describe('image mode', () => {
    function imageRows(fixture: ReturnType<typeof createImageFixture>) {
      return Array.from(
        fixture.nativeElement.querySelectorAll('[data-testid="string-list-row-input"]'),
      ) as HTMLElement[];
    }

    function nestedUrlInput(row: HTMLElement) {
      return row.querySelector('[data-testid="image-input-url-field"]') as HTMLInputElement;
    }

    it('renders an app-image-input per row instead of a plain text input', () => {
      const fixture = createImageFixture([
        { kind: 'url', url: 'https://example.com/a.jpg' },
        { kind: 'url', url: 'https://example.com/b.jpg' },
      ]);

      const rowsRendered = imageRows(fixture);

      expect(rowsRendered).toHaveLength(2);
      expect(rowsRendered.every((row) => row.tagName.toLowerCase() === 'app-image-input')).toBe(true);
      expect(fixture.nativeElement.querySelector('mat-form-field.min-w-0.flex-1')).toBeNull();
    });

    it('drops undefined rows from the emitted value until an image is provided', () => {
      const fixture = createImageFixture([{ kind: 'url', url: 'https://example.com/a.jpg' }]);

      addButton(fixture).click();
      fixture.detectChanges();

      expect(imageRows(fixture)).toHaveLength(2);
      expect(fixture.componentInstance.control.value).toEqual([
        { kind: 'url', url: 'https://example.com/a.jpg' },
      ]);

      const secondRow = imageRows(fixture)[1];
      const urlInput = nestedUrlInput(secondRow);
      urlInput.value = 'https://example.com/b.jpg';
      urlInput.dispatchEvent(new Event('input'));
      fixture.detectChanges();

      expect(fixture.componentInstance.control.value).toEqual([
        { kind: 'url', url: 'https://example.com/a.jpg' },
        { kind: 'url', url: 'https://example.com/b.jpg' },
      ]);
    });

    it('removes an image row when its remove button is clicked', () => {
      const fixture = createImageFixture([
        { kind: 'url', url: 'https://example.com/a.jpg' },
        { kind: 'url', url: 'https://example.com/b.jpg' },
      ]);

      removeButton(fixture, 0).click();
      fixture.detectChanges();

      expect(imageRows(fixture)).toHaveLength(1);
      expect(fixture.componentInstance.control.value).toEqual([
        { kind: 'url', url: 'https://example.com/b.jpg' },
      ]);
    });

    it('propagates a nested ImageInput validation error up to the list control', () => {
      const fixture = createImageFixture([{ kind: 'url', url: 'not-a-url' }]);

      expect(fixture.componentInstance.control.valid).toBe(false);
    });
  });

  describe('row character limit', () => {
    it('does not cap rows or show a hint when rowMaxLength is unset', () => {
      const fixture = createFixture(['Flour']);

      expect(rows(fixture)[0].hasAttribute('maxlength')).toBe(false);
      expect(fixture.nativeElement.querySelector('mat-hint')).toBeNull();
    });

    it('caps the row input and shows how many characters remain when rowMaxLength is set', () => {
      const fixture = createFixture(['Flour'], false, 20);
      const language = TestBed.inject(LanguageService);

      expect(rows(fixture)[0].maxLength).toBe(20);
      expect(fixture.nativeElement.textContent).toContain(
        language.t().fieldLimits.charactersRemaining(20 - 'Flour'.length),
      );
    });

    it('does not apply rowMaxLength to image-mode rows', () => {
      const fixture = createImageFixture([{ kind: 'url', url: 'https://example.com/a.jpg' }], 20);

      expect(fixture.nativeElement.querySelector('mat-hint')).toBeNull();
    });
  });
});

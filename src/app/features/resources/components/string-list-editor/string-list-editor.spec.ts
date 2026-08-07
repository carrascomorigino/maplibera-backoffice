import { Component } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { TestBed } from '@angular/core/testing';
import { StringListEditor } from './string-list-editor';

@Component({
  selector: 'app-host',
  imports: [ReactiveFormsModule, StringListEditor],
  template: `<app-string-list-editor
    [formControl]="control"
    [addButtonLabel]="'Add item'"
    [urlMode]="urlMode"
  />`,
})
class HostComponent {
  control = new FormControl<string[]>([], { nonNullable: true });
  urlMode = false;
}

describe('StringListEditor', () => {
  function createFixture(initial: string[] = [], urlMode = false) {
    TestBed.configureTestingModule({ imports: [HostComponent] });
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.control.setValue(initial);
    fixture.componentInstance.urlMode = urlMode;
    fixture.detectChanges();
    return fixture;
  }

  function rows(fixture: ReturnType<typeof createFixture>) {
    return Array.from(
      fixture.nativeElement.querySelectorAll('[data-testid="string-list-row-input"]'),
    ) as HTMLInputElement[];
  }

  function addButton(fixture: ReturnType<typeof createFixture>) {
    return fixture.nativeElement.querySelector('[data-testid="string-list-add-button"]') as HTMLButtonElement;
  }

  function removeButton(fixture: ReturnType<typeof createFixture>, index: number) {
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
});

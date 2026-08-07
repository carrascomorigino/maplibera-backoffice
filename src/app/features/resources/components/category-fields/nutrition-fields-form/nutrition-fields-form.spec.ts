import { Component } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { TestBed } from '@angular/core/testing';
import { NutritionFieldsForm, NutritionFieldsValue } from './nutrition-fields-form';

@Component({
  selector: 'app-host',
  imports: [ReactiveFormsModule, NutritionFieldsForm],
  template: `<app-nutrition-fields-form [formControl]="control" />`,
})
class HostComponent {
  control = new FormControl<NutritionFieldsValue>(
    { sourceLinks: [], pdfUrls: [], explanatoryText: '' },
    { nonNullable: true },
  );
}

describe('NutritionFieldsForm', () => {
  function createFixture() {
    TestBed.configureTestingModule({ imports: [HostComponent] });
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('starts valid with empty optional fields', () => {
    const fixture = createFixture();

    expect(fixture.componentInstance.control.valid).toBe(true);
  });

  it('writes back explanatoryText changes to the host control', () => {
    const fixture = createFixture();
    const textarea = fixture.nativeElement.querySelector(
      '[data-testid="nutrition-explanatory-text"]',
    ) as HTMLTextAreaElement;

    textarea.value = 'Some explanatory text';
    textarea.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(fixture.componentInstance.control.value.explanatoryText).toBe('Some explanatory text');
  });

  it('round-trips an existing value via writeValue', () => {
    const fixture = createFixture();

    fixture.componentInstance.control.setValue({
      sourceLinks: ['https://example.com/study'],
      pdfUrls: ['https://example.com/doc.pdf'],
      explanatoryText: 'Existing text',
    });
    fixture.detectChanges();

    const textarea = fixture.nativeElement.querySelector(
      '[data-testid="nutrition-explanatory-text"]',
    ) as HTMLTextAreaElement;
    expect(textarea.value).toBe('Existing text');
  });

  it('becomes invalid when a source link is not a valid URL', () => {
    const fixture = createFixture();

    fixture.componentInstance.control.setValue({
      sourceLinks: ['not-a-url'],
      pdfUrls: [],
      explanatoryText: '',
    });
    fixture.detectChanges();

    expect(fixture.componentInstance.control.valid).toBe(false);
  });
});

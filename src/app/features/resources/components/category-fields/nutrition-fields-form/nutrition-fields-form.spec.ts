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
    { sourceLinks: [], pdfUrls: [] },
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

  it('round-trips an existing value via writeValue', () => {
    const fixture = createFixture();

    fixture.componentInstance.control.setValue({
      sourceLinks: ['https://example.com/study'],
      pdfUrls: ['https://example.com/doc.pdf'],
    });
    fixture.detectChanges();

    const rows = fixture.nativeElement.querySelectorAll('[data-testid="string-list-row-input"]');
    expect(rows.length).toBe(2);
  });

  it('becomes invalid when a source link is not a valid URL', () => {
    const fixture = createFixture();

    fixture.componentInstance.control.setValue({
      sourceLinks: ['not-a-url'],
      pdfUrls: [],
    });
    fixture.detectChanges();

    expect(fixture.componentInstance.control.valid).toBe(false);
  });
});

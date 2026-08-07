import { Component } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { TestBed } from '@angular/core/testing';
import { RecipeFieldsForm, RecipeFieldsValue } from './recipe-fields-form';

@Component({
  selector: 'app-host',
  imports: [ReactiveFormsModule, RecipeFieldsForm],
  template: `<app-recipe-fields-form [formControl]="control" />`,
})
class HostComponent {
  control = new FormControl<RecipeFieldsValue>(
    { preparationMinutes: 0, photoUrls: [], ingredients: [], steps: [] },
    { nonNullable: true },
  );
}

describe('RecipeFieldsForm', () => {
  function createFixture() {
    TestBed.configureTestingModule({ imports: [HostComponent] });
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('is invalid when preparationMinutes is zero or missing', () => {
    const fixture = createFixture();

    expect(fixture.componentInstance.control.valid).toBe(false);
  });

  it('becomes valid once preparationMinutes is a positive number', () => {
    const fixture = createFixture();
    const input = fixture.nativeElement.querySelector(
      '[data-testid="recipe-preparation-minutes"]',
    ) as HTMLInputElement;

    input.value = '20';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(fixture.componentInstance.control.value.preparationMinutes).toBe(20);
    expect(fixture.componentInstance.control.valid).toBe(true);
  });

  it('round-trips ingredients and steps via writeValue', () => {
    const fixture = createFixture();

    fixture.componentInstance.control.setValue({
      preparationMinutes: 15,
      photoUrls: [],
      ingredients: ['Flour', 'Sugar'],
      steps: ['Mix', 'Bake'],
    });
    fixture.detectChanges();

    const rows = fixture.nativeElement.querySelectorAll('[data-testid="string-list-row-input"]');
    expect(rows.length).toBe(4);
  });
});

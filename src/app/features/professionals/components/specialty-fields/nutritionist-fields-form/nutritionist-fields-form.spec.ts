import { Component } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { TestBed } from '@angular/core/testing';
import { NutritionistFieldsForm, NutritionistFieldsValue } from './nutritionist-fields-form';

@Component({
  selector: 'app-host',
  imports: [ReactiveFormsModule, NutritionistFieldsForm],
  template: `<app-nutritionist-fields-form [formControl]="control" />`,
})
class HostComponent {
  control = new FormControl<NutritionistFieldsValue>(
    { licenseNumber: '', dietarySpecialties: [] },
    { nonNullable: true },
  );
}

describe('NutritionistFieldsForm', () => {
  function createFixture() {
    TestBed.configureTestingModule({ imports: [HostComponent] });
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('starts invalid because licenseNumber is required', () => {
    const fixture = createFixture();

    expect(fixture.componentInstance.control.valid).toBe(false);
  });

  it('writes back licenseNumber changes to the host control', () => {
    const fixture = createFixture();
    const input = fixture.nativeElement.querySelector(
      '[data-testid="nutritionist-license-number"]',
    ) as HTMLInputElement;

    input.value = 'AB123';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(fixture.componentInstance.control.value.licenseNumber).toBe('AB123');
    expect(fixture.componentInstance.control.valid).toBe(true);
  });

  it('round-trips an existing value via writeValue', () => {
    const fixture = createFixture();

    fixture.componentInstance.control.setValue({
      licenseNumber: 'CD456',
      dietarySpecialties: ['clinical', 'sports-nutrition'],
    });
    fixture.detectChanges();

    const input = fixture.nativeElement.querySelector(
      '[data-testid="nutritionist-license-number"]',
    ) as HTMLInputElement;
    expect(input.value).toBe('CD456');
  });
});

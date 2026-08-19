import { Component } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { TestBed } from '@angular/core/testing';
import { DentistFieldsForm, DentistFieldsValue } from './dentist-fields-form';

@Component({
  selector: 'app-host',
  imports: [ReactiveFormsModule, DentistFieldsForm],
  template: `<app-dentist-fields-form [formControl]="control" />`,
})
class HostComponent {
  control = new FormControl<DentistFieldsValue>(
    { licenseNumber: '', acceptsChildren: false },
    { nonNullable: true },
  );
}

describe('DentistFieldsForm', () => {
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

  it('defaults acceptsChildren to false', () => {
    const fixture = createFixture();
    const checkbox = fixture.nativeElement.querySelector(
      '[data-testid="dentist-accepts-children"]',
    ) as HTMLInputElement;

    expect(checkbox.checked).toBe(false);
  });

  it('writes back licenseNumber and acceptsChildren changes to the host control', () => {
    const fixture = createFixture();
    const licenseInput = fixture.nativeElement.querySelector(
      '[data-testid="dentist-license-number"]',
    ) as HTMLInputElement;
    const checkbox = fixture.nativeElement.querySelector(
      '[data-testid="dentist-accepts-children"]',
    ) as HTMLInputElement;

    licenseInput.value = 'DDS123';
    licenseInput.dispatchEvent(new Event('input'));
    checkbox.click();
    fixture.detectChanges();

    expect(fixture.componentInstance.control.value).toEqual({
      licenseNumber: 'DDS123',
      acceptsChildren: true,
    });
    expect(fixture.componentInstance.control.valid).toBe(true);
  });

  it('round-trips an existing value via writeValue', () => {
    const fixture = createFixture();

    fixture.componentInstance.control.setValue({ licenseNumber: 'DDS999', acceptsChildren: true });
    fixture.detectChanges();

    const licenseInput = fixture.nativeElement.querySelector(
      '[data-testid="dentist-license-number"]',
    ) as HTMLInputElement;
    const checkbox = fixture.nativeElement.querySelector(
      '[data-testid="dentist-accepts-children"]',
    ) as HTMLInputElement;
    expect(licenseInput.value).toBe('DDS999');
    expect(checkbox.checked).toBe(true);
  });
});

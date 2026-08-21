import { Component } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { TestBed } from '@angular/core/testing';
import { DoctorFieldsForm, DoctorFieldsValue } from './doctor-fields-form';

@Component({
  selector: 'app-host',
  imports: [ReactiveFormsModule, DoctorFieldsForm],
  template: `<app-doctor-fields-form [formControl]="control" />`,
})
class HostComponent {
  control = new FormControl<DoctorFieldsValue>(
    { medicalLicenseNumber: '', medicalSpecialty: '' },
    { nonNullable: true },
  );
}

describe('DoctorFieldsForm', () => {
  function createFixture() {
    TestBed.configureTestingModule({ imports: [HostComponent] });
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('starts invalid because both fields are required', () => {
    const fixture = createFixture();

    expect(fixture.componentInstance.control.valid).toBe(false);
  });

  it('writes back medicalLicenseNumber and medicalSpecialty changes to the host control', () => {
    const fixture = createFixture();
    const licenseInput = fixture.nativeElement.querySelector(
      '[data-testid="doctor-medical-license-number"]',
    ) as HTMLInputElement;
    const specialtyInput = fixture.nativeElement.querySelector(
      '[data-testid="doctor-medical-specialty"]',
    ) as HTMLInputElement;

    licenseInput.value = 'MD123';
    licenseInput.dispatchEvent(new Event('input'));
    specialtyInput.value = 'Cardiology';
    specialtyInput.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(fixture.componentInstance.control.value).toEqual({
      medicalLicenseNumber: 'MD123',
      medicalSpecialty: 'Cardiology',
    });
    expect(fixture.componentInstance.control.valid).toBe(true);
  });

  it('round-trips an existing value via writeValue', () => {
    const fixture = createFixture();

    fixture.componentInstance.control.setValue({
      medicalLicenseNumber: 'MD999',
      medicalSpecialty: 'Nutrition Medicine',
    });
    fixture.detectChanges();

    const licenseInput = fixture.nativeElement.querySelector(
      '[data-testid="doctor-medical-license-number"]',
    ) as HTMLInputElement;
    expect(licenseInput.value).toBe('MD999');
  });
});

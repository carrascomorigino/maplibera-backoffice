import { ChangeDetectionStrategy, Component, forwardRef, inject } from '@angular/core';
import {
  AbstractControl,
  ControlValueAccessor,
  FormControl,
  FormGroup,
  NG_VALIDATORS,
  NG_VALUE_ACCESSOR,
  ReactiveFormsModule,
  ValidationErrors,
  Validator,
  Validators,
} from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { LanguageService } from '../../../../../core/i18n/language.service';

export interface DoctorFieldsValue {
  medicalLicenseNumber: string;
  medicalSpecialty: string;
}

@Component({
  selector: 'app-doctor-fields-form',
  imports: [ReactiveFormsModule, MatFormFieldModule, MatInputModule],
  templateUrl: './doctor-fields-form.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => DoctorFieldsForm), multi: true },
    { provide: NG_VALIDATORS, useExisting: forwardRef(() => DoctorFieldsForm), multi: true },
  ],
})
export class DoctorFieldsForm implements ControlValueAccessor, Validator {
  protected readonly language = inject(LanguageService);

  readonly form = new FormGroup({
    medicalLicenseNumber: new FormControl('', { nonNullable: true, validators: Validators.required }),
    medicalSpecialty: new FormControl('', { nonNullable: true, validators: Validators.required }),
  });

  private onChange: (value: DoctorFieldsValue) => void = () => {};
  private onTouched: () => void = () => {};
  private onValidatorChange: () => void = () => {};

  constructor() {
    this.form.valueChanges.subscribe(() => this.onChange(this.form.getRawValue()));
    this.form.statusChanges.subscribe(() => this.onValidatorChange());
  }

  writeValue(value: DoctorFieldsValue | undefined): void {
    this.form.reset(
      {
        medicalLicenseNumber: value?.medicalLicenseNumber ?? '',
        medicalSpecialty: value?.medicalSpecialty ?? '',
      },
      { emitEvent: false },
    );
  }

  registerOnChange(fn: (value: DoctorFieldsValue) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  registerOnValidatorChange(fn: () => void): void {
    this.onValidatorChange = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    if (isDisabled) {
      this.form.disable({ emitEvent: false });
    } else {
      this.form.enable({ emitEvent: false });
    }
  }

  validate(_control?: AbstractControl): ValidationErrors | null {
    return this.form.valid ? null : { doctorFields: true };
  }

  onBlur(): void {
    this.onTouched();
  }
}

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

export interface DentistFieldsValue {
  licenseNumber: string;
  acceptsChildren: boolean;
}

@Component({
  selector: 'app-dentist-fields-form',
  imports: [ReactiveFormsModule, MatFormFieldModule, MatInputModule],
  templateUrl: './dentist-fields-form.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => DentistFieldsForm), multi: true },
    { provide: NG_VALIDATORS, useExisting: forwardRef(() => DentistFieldsForm), multi: true },
  ],
})
export class DentistFieldsForm implements ControlValueAccessor, Validator {
  protected readonly language = inject(LanguageService);

  readonly form = new FormGroup({
    licenseNumber: new FormControl('', { nonNullable: true, validators: Validators.required }),
    acceptsChildren: new FormControl(false, { nonNullable: true }),
  });

  private onChange: (value: DentistFieldsValue) => void = () => {};
  private onTouched: () => void = () => {};
  private onValidatorChange: () => void = () => {};

  constructor() {
    this.form.valueChanges.subscribe(() => this.onChange(this.form.getRawValue()));
    this.form.statusChanges.subscribe(() => this.onValidatorChange());
  }

  writeValue(value: DentistFieldsValue | undefined): void {
    this.form.reset(
      {
        licenseNumber: value?.licenseNumber ?? '',
        acceptsChildren: value?.acceptsChildren ?? false,
      },
      { emitEvent: false },
    );
  }

  registerOnChange(fn: (value: DentistFieldsValue) => void): void {
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
    return this.form.valid ? null : { dentistFields: true };
  }

  onBlur(): void {
    this.onTouched();
  }
}

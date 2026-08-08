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
import { URL_PATTERN } from '../../../../../shared/utils/patterns';
import { LanguageService } from '../../../../../core/i18n/language.service';

export interface AppFieldsValue {
  appStoreUrl: string;
  playStoreUrl: string;
  iconUrl: string;
}

@Component({
  selector: 'app-app-fields-form',
  imports: [ReactiveFormsModule, MatFormFieldModule, MatInputModule],
  templateUrl: './app-fields-form.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => AppFieldsForm), multi: true },
    { provide: NG_VALIDATORS, useExisting: forwardRef(() => AppFieldsForm), multi: true },
  ],
})
export class AppFieldsForm implements ControlValueAccessor, Validator {
  protected readonly language = inject(LanguageService);

  readonly form = new FormGroup({
    appStoreUrl: new FormControl('', { nonNullable: true, validators: Validators.pattern(URL_PATTERN) }),
    playStoreUrl: new FormControl('', { nonNullable: true, validators: Validators.pattern(URL_PATTERN) }),
    iconUrl: new FormControl('', { nonNullable: true, validators: Validators.pattern(URL_PATTERN) }),
  });

  private onChange: (value: AppFieldsValue) => void = () => {};
  private onTouched: () => void = () => {};
  private onValidatorChange: () => void = () => {};

  constructor() {
    this.form.valueChanges.subscribe(() => this.onChange(this.form.getRawValue()));
    this.form.statusChanges.subscribe(() => this.onValidatorChange());
  }

  writeValue(value: AppFieldsValue | undefined): void {
    this.form.reset(
      {
        appStoreUrl: value?.appStoreUrl ?? '',
        playStoreUrl: value?.playStoreUrl ?? '',
        iconUrl: value?.iconUrl ?? '',
      },
      { emitEvent: false },
    );
  }

  registerOnChange(fn: (value: AppFieldsValue) => void): void {
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
    return this.form.valid ? null : { appFields: true };
  }

  onBlur(): void {
    this.onTouched();
  }
}

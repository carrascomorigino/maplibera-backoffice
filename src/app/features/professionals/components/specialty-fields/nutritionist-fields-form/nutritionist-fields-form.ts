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
import { StringListEditor } from '../../../../../shared/components/string-list-editor/string-list-editor';
import { LanguageService } from '../../../../../core/i18n/language.service';

export interface NutritionistFieldsValue {
  licenseNumber: string;
  dietarySpecialties: string[];
}

@Component({
  selector: 'app-nutritionist-fields-form',
  imports: [ReactiveFormsModule, MatFormFieldModule, MatInputModule, StringListEditor],
  templateUrl: './nutritionist-fields-form.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => NutritionistFieldsForm), multi: true },
    { provide: NG_VALIDATORS, useExisting: forwardRef(() => NutritionistFieldsForm), multi: true },
  ],
})
export class NutritionistFieldsForm implements ControlValueAccessor, Validator {
  protected readonly language = inject(LanguageService);

  readonly form = new FormGroup({
    licenseNumber: new FormControl('', { nonNullable: true, validators: Validators.required }),
    dietarySpecialties: new FormControl<string[]>([], { nonNullable: true }),
  });

  private onChange: (value: NutritionistFieldsValue) => void = () => {};
  private onTouched: () => void = () => {};
  private onValidatorChange: () => void = () => {};

  constructor() {
    this.form.valueChanges.subscribe(() => this.onChange(this.form.getRawValue()));
    this.form.statusChanges.subscribe(() => this.onValidatorChange());
  }

  writeValue(value: NutritionistFieldsValue | undefined): void {
    this.form.reset(
      {
        licenseNumber: value?.licenseNumber ?? '',
        dietarySpecialties: value?.dietarySpecialties ?? [],
      },
      { emitEvent: false },
    );
  }

  registerOnChange(fn: (value: NutritionistFieldsValue) => void): void {
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
    return this.form.valid ? null : { nutritionistFields: true };
  }

  onBlur(): void {
    this.onTouched();
  }
}

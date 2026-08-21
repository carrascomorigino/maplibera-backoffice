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
} from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { StringListEditor } from '../../../../../shared/components/string-list-editor/string-list-editor';
import { LanguageService } from '../../../../../core/i18n/language.service';

export interface NutritionFieldsValue {
  sourceLinks: string[];
  pdfUrls: string[];
}

@Component({
  selector: 'app-nutrition-fields-form',
  imports: [ReactiveFormsModule, MatFormFieldModule, MatInputModule, StringListEditor],
  templateUrl: './nutrition-fields-form.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => NutritionFieldsForm), multi: true },
    { provide: NG_VALIDATORS, useExisting: forwardRef(() => NutritionFieldsForm), multi: true },
  ],
})
export class NutritionFieldsForm implements ControlValueAccessor, Validator {
  protected readonly language = inject(LanguageService);

  readonly form = new FormGroup({
    sourceLinks: new FormControl<string[]>([], { nonNullable: true }),
    pdfUrls: new FormControl<string[]>([], { nonNullable: true }),
  });

  private onChange: (value: NutritionFieldsValue) => void = () => {};
  private onTouched: () => void = () => {};
  private onValidatorChange: () => void = () => {};

  constructor() {
    this.form.valueChanges.subscribe(() => this.onChange(this.form.getRawValue()));
    this.form.statusChanges.subscribe(() => this.onValidatorChange());
  }

  writeValue(value: NutritionFieldsValue | undefined): void {
    this.form.reset(
      {
        sourceLinks: value?.sourceLinks ?? [],
        pdfUrls: value?.pdfUrls ?? [],
      },
      { emitEvent: false },
    );
  }

  registerOnChange(fn: (value: NutritionFieldsValue) => void): void {
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
    return this.form.valid ? null : { nutritionFields: true };
  }

  onBlur(): void {
    this.onTouched();
  }
}

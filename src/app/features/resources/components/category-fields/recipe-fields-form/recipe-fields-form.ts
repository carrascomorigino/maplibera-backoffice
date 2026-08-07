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
import { StringListEditor } from '../../string-list-editor/string-list-editor';
import { LanguageService } from '../../../../../core/i18n/language.service';

export interface RecipeFieldsValue {
  preparationMinutes: number;
  photoUrls: string[];
  ingredients: string[];
  steps: string[];
}

@Component({
  selector: 'app-recipe-fields-form',
  imports: [ReactiveFormsModule, MatFormFieldModule, MatInputModule, StringListEditor],
  templateUrl: './recipe-fields-form.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => RecipeFieldsForm), multi: true },
    { provide: NG_VALIDATORS, useExisting: forwardRef(() => RecipeFieldsForm), multi: true },
  ],
})
export class RecipeFieldsForm implements ControlValueAccessor, Validator {
  protected readonly language = inject(LanguageService);

  readonly form = new FormGroup({
    preparationMinutes: new FormControl(0, {
      nonNullable: true,
      validators: [Validators.required, Validators.min(1)],
    }),
    photoUrls: new FormControl<string[]>([], { nonNullable: true }),
    ingredients: new FormControl<string[]>([], { nonNullable: true }),
    steps: new FormControl<string[]>([], { nonNullable: true }),
  });

  private onChange: (value: RecipeFieldsValue) => void = () => {};
  private onTouched: () => void = () => {};
  private onValidatorChange: () => void = () => {};

  constructor() {
    this.form.valueChanges.subscribe(() => this.onChange(this.form.getRawValue()));
    this.form.statusChanges.subscribe(() => this.onValidatorChange());
  }

  writeValue(value: RecipeFieldsValue | undefined): void {
    this.form.reset(
      {
        preparationMinutes: value?.preparationMinutes ?? 0,
        photoUrls: value?.photoUrls ?? [],
        ingredients: value?.ingredients ?? [],
        steps: value?.steps ?? [],
      },
      { emitEvent: false },
    );
  }

  registerOnChange(fn: (value: RecipeFieldsValue) => void): void {
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
    return this.form.valid ? null : { recipeFields: true };
  }

  onBlur(): void {
    this.onTouched();
  }
}

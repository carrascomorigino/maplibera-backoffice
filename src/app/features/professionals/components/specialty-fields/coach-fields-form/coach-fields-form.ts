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
import { StringListEditor } from '../../../../../shared/components/string-list-editor/string-list-editor';
import { LanguageService } from '../../../../../core/i18n/language.service';

export interface CoachFieldsValue {
  certifications: string[];
  coachingAreas: string[];
}

@Component({
  selector: 'app-coach-fields-form',
  imports: [ReactiveFormsModule, StringListEditor],
  templateUrl: './coach-fields-form.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => CoachFieldsForm), multi: true },
    { provide: NG_VALIDATORS, useExisting: forwardRef(() => CoachFieldsForm), multi: true },
  ],
})
export class CoachFieldsForm implements ControlValueAccessor, Validator {
  protected readonly language = inject(LanguageService);

  readonly form = new FormGroup({
    certifications: new FormControl<string[]>([], { nonNullable: true }),
    coachingAreas: new FormControl<string[]>([], { nonNullable: true }),
  });

  private onChange: (value: CoachFieldsValue) => void = () => {};
  private onTouched: () => void = () => {};
  private onValidatorChange: () => void = () => {};

  constructor() {
    this.form.valueChanges.subscribe(() => this.onChange(this.form.getRawValue()));
    this.form.statusChanges.subscribe(() => this.onValidatorChange());
  }

  writeValue(value: CoachFieldsValue | undefined): void {
    this.form.reset(
      {
        certifications: value?.certifications ?? [],
        coachingAreas: value?.coachingAreas ?? [],
      },
      { emitEvent: false },
    );
  }

  registerOnChange(fn: (value: CoachFieldsValue) => void): void {
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
    return this.form.valid ? null : { coachFields: true };
  }

  onBlur(): void {
    this.onTouched();
  }
}

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
import { MatSelectModule } from '@angular/material/select';
import { MultimediaType } from '../../../models/resource.model';
import { ImageInput } from '../../../../../shared/components/image-input/image-input';
import { ImageValue } from '../../../../../shared/models/image-value.model';
import { URL_PATTERN } from '../../../../../shared/utils/patterns';
import { LanguageService } from '../../../../../core/i18n/language.service';

export interface MultimediaFieldsValue {
  mediaType: MultimediaType;
  externalUrl: string;
  posterUrl: ImageValue | undefined;
}

@Component({
  selector: 'app-multimedia-fields-form',
  imports: [ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatSelectModule, ImageInput],
  templateUrl: './multimedia-fields-form.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => MultimediaFieldsForm), multi: true },
    { provide: NG_VALIDATORS, useExisting: forwardRef(() => MultimediaFieldsForm), multi: true },
  ],
})
export class MultimediaFieldsForm implements ControlValueAccessor, Validator {
  protected readonly language = inject(LanguageService);

  readonly form = new FormGroup({
    mediaType: new FormControl<MultimediaType>('documentary', {
      nonNullable: true,
      validators: Validators.required,
    }),
    externalUrl: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(URL_PATTERN)],
    }),
    posterUrl: new FormControl<ImageValue | undefined>(undefined, { nonNullable: true }),
  });

  private onChange: (value: MultimediaFieldsValue) => void = () => {};
  private onTouched: () => void = () => {};
  private onValidatorChange: () => void = () => {};

  constructor() {
    this.form.valueChanges.subscribe(() => this.onChange(this.form.getRawValue()));
    this.form.statusChanges.subscribe(() => this.onValidatorChange());
  }

  writeValue(value: MultimediaFieldsValue | undefined): void {
    this.form.reset(
      {
        mediaType: value?.mediaType ?? 'documentary',
        externalUrl: value?.externalUrl ?? '',
        posterUrl: value?.posterUrl,
      },
      { emitEvent: false },
    );
  }

  registerOnChange(fn: (value: MultimediaFieldsValue) => void): void {
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
    return this.form.valid ? null : { multimediaFields: true };
  }

  onBlur(): void {
    this.onTouched();
  }
}

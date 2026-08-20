import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  forwardRef,
  inject,
  input,
} from '@angular/core';
import {
  AbstractControl,
  ControlValueAccessor,
  FormArray,
  FormControl,
  NG_VALIDATORS,
  NG_VALUE_ACCESSOR,
  ReactiveFormsModule,
  ValidationErrors,
  Validator,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { ImageInput } from '../image-input/image-input';
import { ImageValue } from '../../models/image-value.model';
import { URL_PATTERN } from '../../utils/patterns';
import { LanguageService } from '../../../core/i18n/language.service';

type RowValue = string | ImageValue | undefined;

@Component({
  selector: 'app-string-list-editor',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    ImageInput,
  ],
  templateUrl: './string-list-editor.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => StringListEditor), multi: true },
    { provide: NG_VALIDATORS, useExisting: forwardRef(() => StringListEditor), multi: true },
  ],
})
export class StringListEditor implements ControlValueAccessor, Validator, AfterViewInit {
  private readonly cdr = inject(ChangeDetectorRef);
  protected readonly language = inject(LanguageService);

  readonly addButtonLabel = input.required<string>();
  readonly urlMode = input(false);
  readonly imageMode = input(false);
  readonly imageRowLabel = input('');

  readonly rows = new FormArray<FormControl<RowValue>>([]);

  private onChange: (value: (string | ImageValue)[]) => void = () => {};
  private onTouched: () => void = () => {};
  private onValidatorChange: () => void = () => {};

  constructor() {
    this.rows.valueChanges.subscribe((values) => {
      if (this.imageMode()) {
        const imageValues = (values as RowValue[]).filter(
          (value): value is ImageValue => value !== undefined && typeof value === 'object',
        );
        this.onChange(imageValues);
      } else {
        const stringValues = (values as RowValue[]).filter(
          (value): value is string => typeof value === 'string' && value.trim().length > 0,
        );
        this.onChange(stringValues);
      }
    });
    this.rows.statusChanges.subscribe(() => this.onValidatorChange());
  }

  ngAfterViewInit(): void {
    // In image mode, each row's `app-image-input` composes its own NG_VALIDATORS
    // onto the row control from *its* `ngOnChanges`, which runs while Angular is
    // still rendering this component's view — i.e. after the host form control's
    // own initial `updateValueAndValidity()` already ran `validate()` once with
    // stale (pre-composition) row validity, and with `emitEvent: false` the whole
    // way up, so `rows.statusChanges` never fired to correct it. Now that the view
    // (and every nested value accessor) has settled, re-validate for real.
    if (this.imageMode()) {
      this.rows.updateValueAndValidity({ emitEvent: true });
    }
  }

  writeValue(value: (string | ImageValue)[] | undefined): void {
    this.rows.clear({ emitEvent: false });
    (value ?? []).forEach((item) => this.rows.push(this.buildControl(item), { emitEvent: false }));
    this.cdr.markForCheck();
  }

  registerOnChange(fn: (value: (string | ImageValue)[]) => void): void {
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
      this.rows.disable({ emitEvent: false });
    } else {
      this.rows.enable({ emitEvent: false });
    }
  }

  validate(_control?: AbstractControl): ValidationErrors | null {
    return this.rows.valid ? null : { stringList: true };
  }

  onBlur(): void {
    this.onTouched();
  }

  addRow(): void {
    this.rows.push(this.buildControl(this.imageMode() ? undefined : ''));
    this.cdr.markForCheck();
  }

  removeRow(index: number): void {
    this.rows.removeAt(index);
    this.cdr.markForCheck();
  }

  private buildControl(value: RowValue): FormControl<RowValue> {
    if (this.imageMode()) {
      // Pass a boxed FormControlState so an `undefined` value is preserved as-is:
      // passing `undefined` directly as the constructor's first argument would
      // trigger Angular's own default parameter (which resolves to `null`).
      return new FormControl<RowValue>({ value, disabled: false }, { nonNullable: true });
    }
    return new FormControl<RowValue>((value as string | undefined) ?? '', {
      nonNullable: true,
      validators: this.urlMode() ? Validators.pattern(URL_PATTERN) : [],
    });
  }
}

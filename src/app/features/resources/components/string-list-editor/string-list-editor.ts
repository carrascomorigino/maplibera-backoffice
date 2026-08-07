import { ChangeDetectionStrategy, ChangeDetectorRef, Component, forwardRef, inject, input } from '@angular/core';
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
import { URL_PATTERN } from '../../../guide/utils/patterns';
import { LanguageService } from '../../../../core/i18n/language.service';

@Component({
  selector: 'app-string-list-editor',
  imports: [ReactiveFormsModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatIconModule],
  templateUrl: './string-list-editor.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => StringListEditor), multi: true },
    { provide: NG_VALIDATORS, useExisting: forwardRef(() => StringListEditor), multi: true },
  ],
})
export class StringListEditor implements ControlValueAccessor, Validator {
  private readonly cdr = inject(ChangeDetectorRef);
  protected readonly language = inject(LanguageService);

  readonly addButtonLabel = input.required<string>();
  readonly urlMode = input(false);

  readonly rows = new FormArray<FormControl<string>>([]);

  private onChange: (value: string[]) => void = () => {};
  private onTouched: () => void = () => {};
  private onValidatorChange: () => void = () => {};

  constructor() {
    this.rows.valueChanges.subscribe((values) => {
      this.onChange((values as string[]).filter((value) => value.trim().length > 0));
    });
    this.rows.statusChanges.subscribe(() => this.onValidatorChange());
  }

  writeValue(value: string[] | undefined): void {
    this.rows.clear({ emitEvent: false });
    (value ?? []).forEach((item) => this.rows.push(this.buildControl(item), { emitEvent: false }));
    this.cdr.markForCheck();
  }

  registerOnChange(fn: (value: string[]) => void): void {
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
    this.rows.push(this.buildControl(''));
    this.cdr.markForCheck();
  }

  removeRow(index: number): void {
    this.rows.removeAt(index);
    this.cdr.markForCheck();
  }

  private buildControl(value: string): FormControl<string> {
    return new FormControl(value, {
      nonNullable: true,
      validators: this.urlMode() ? Validators.pattern(URL_PATTERN) : [],
    });
  }
}

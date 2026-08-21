import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  ElementRef,
  forwardRef,
  inject,
  input,
  viewChild,
} from '@angular/core';
import {
  AbstractControl,
  ControlValueAccessor,
  FormArray,
  FormControl,
  FormGroup,
  NG_VALIDATORS,
  NG_VALUE_ACCESSOR,
  ReactiveFormsModule,
  ValidationErrors,
  Validator,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { ImageInput } from '../image-input/image-input';
import { ImageValue } from '../../models/image-value.model';
import { GalleryImageValue } from '../../models/gallery-image-value.model';
import { MAX_GALLERY_IMAGES } from '../../utils/gallery-limits';
import { LanguageService } from '../../../core/i18n/language.service';

type GalleryRowGroup = FormGroup<{
  image: FormControl<ImageValue | undefined>;
  description: FormControl<string>;
}>;

@Component({
  selector: 'app-image-gallery-input',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    ImageInput,
  ],
  templateUrl: './image-gallery-input.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => ImageGalleryInput), multi: true },
    { provide: NG_VALIDATORS, useExisting: forwardRef(() => ImageGalleryInput), multi: true },
  ],
})
export class ImageGalleryInput implements ControlValueAccessor, Validator, AfterViewInit {
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly language = inject(LanguageService);

  readonly imageRowLabel = input.required<string>();
  readonly addButtonLabel = input.required<string>();
  readonly descriptionLabel = input.required<string>();
  readonly descriptionMaxLength = input<number | undefined>(undefined);
  readonly maxImages = input(MAX_GALLERY_IMAGES);

  readonly rows = new FormArray<GalleryRowGroup>([]);

  private readonly addButtonRef = viewChild('addButton', { read: ElementRef<HTMLButtonElement> });

  private onChange: (value: GalleryImageValue[]) => void = () => {};
  private onTouched: () => void = () => {};
  private onValidatorChange: () => void = () => {};

  constructor() {
    this.rows.valueChanges.subscribe((values) => {
      const galleryValues = values
        .filter(
          (row): row is { image: ImageValue; description: string } => row.image !== undefined,
        )
        .map((row) => {
          const description = row.description.trim();
          return description ? { image: row.image, description } : { image: row.image };
        });
      this.onChange(galleryValues);
    });
    this.rows.statusChanges.subscribe(() => this.onValidatorChange());
  }

  ngAfterViewInit(): void {
    // Each row's `app-image-input` composes its own NG_VALIDATORS onto the
    // row's `image` control from *its* `ngOnChanges`, which runs while
    // Angular is still rendering this component's view — i.e. after the
    // host form control's own initial `updateValueAndValidity()` already ran
    // `validate()` once with stale (pre-composition) row validity, and with
    // `emitEvent: false` the whole way up, so `rows.statusChanges` never
    // fired to correct it. Now that the view (and every nested value
    // accessor) has settled, re-validate for real.
    this.rows.updateValueAndValidity({ emitEvent: true });
  }

  writeValue(value: GalleryImageValue[] | undefined): void {
    this.rows.clear({ emitEvent: false });
    (value ?? []).forEach((item) => this.rows.push(this.buildRow(item), { emitEvent: false }));
    this.cdr.markForCheck();
  }

  registerOnChange(fn: (value: GalleryImageValue[]) => void): void {
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
    return this.rows.valid ? null : { imageGallery: true };
  }

  onBlur(): void {
    this.onTouched();
  }

  rowLabel(index: number): string {
    return `${this.imageRowLabel()} (${index + 1}/${this.maxImages()})`;
  }

  addRow(): void {
    if (this.rows.length >= this.maxImages()) {
      return;
    }
    this.rows.push(this.buildRow());
    this.cdr.markForCheck();
  }

  removeRow(index: number): void {
    this.rows.removeAt(index);
    this.cdr.markForCheck();
    // The row (and its focused remove button) is gone from the DOM after this change
    // detection cycle; without an explicit target, focus would silently fall back to
    // <body>. The add button is always present, so it's a safe, predictable landing spot.
    const timeoutId = setTimeout(() => this.addButtonRef()?.nativeElement?.focus());
    this.destroyRef.onDestroy(() => clearTimeout(timeoutId));
  }

  private buildRow(item?: GalleryImageValue): GalleryRowGroup {
    return new FormGroup({
      // Pass a boxed FormControlState so an `undefined` value is preserved
      // as-is: passing `undefined` directly as the constructor's first
      // argument would trigger Angular's own default parameter (which
      // resolves to `null`).
      image: new FormControl<ImageValue | undefined>(
        { value: item?.image, disabled: false },
        { nonNullable: true },
      ),
      description: new FormControl(item?.description ?? '', { nonNullable: true }),
    });
  }
}

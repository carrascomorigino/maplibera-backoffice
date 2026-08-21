import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  computed,
  effect,
  forwardRef,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import {
  AbstractControl,
  ControlValueAccessor,
  FormControl,
  NG_VALIDATORS,
  NG_VALUE_ACCESSOR,
  ReactiveFormsModule,
  ValidationErrors,
  Validator,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule, MatButtonToggleChange } from '@angular/material/button-toggle';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { ImageValue } from '../../models/image-value.model';
import { ACCEPTED_IMAGE_MIME_TYPES, MAX_IMAGE_SIZE_BYTES } from '../../utils/image-upload';
import { URL_PATTERN } from '../../utils/patterns';
import { LanguageService } from '../../../core/i18n/language.service';

type ImageInputMode = 'url' | 'upload';
type FileError = 'invalidType' | 'tooLarge' | null;

@Component({
  selector: 'app-image-input',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatButtonToggleModule,
    MatFormFieldModule,
    MatInputModule,
  ],
  templateUrl: './image-input.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => ImageInput), multi: true },
    { provide: NG_VALIDATORS, useExisting: forwardRef(() => ImageInput), multi: true },
  ],
})
export class ImageInput implements ControlValueAccessor, Validator {
  private static nextId = 0;

  private readonly destroyRef = inject(DestroyRef);
  protected readonly language = inject(LanguageService);

  protected readonly instanceId = ImageInput.nextId++;

  readonly label = input.required<string>();

  private readonly fileInputRef = viewChild<ElementRef<HTMLInputElement>>('fileInput');

  protected readonly mode = signal<ImageInputMode>('url');
  protected readonly fileError = signal<FileError>(null);
  protected readonly acceptedMimeTypes = ACCEPTED_IMAGE_MIME_TYPES.join(',');
  protected readonly maxSizeMb = MAX_IMAGE_SIZE_BYTES / (1024 * 1024);

  protected readonly urlControl = new FormControl('', { nonNullable: true });

  private readonly currentValue = signal<ImageValue | undefined>(undefined);
  private readonly uploadPreviewUrl = signal<string | null>(null);
  private previousObjectUrl: string | null = null;

  protected readonly hasUploadValue = computed(() => this.currentValue()?.kind === 'upload');

  protected readonly isValidUrl = computed(() => {
    const value = this.currentValue();
    return value?.kind === 'url' ? URL_PATTERN.test(value.url) : true;
  });

  protected readonly previewSrc = computed<string | null>(() => {
    const value = this.currentValue();
    if (!value) {
      return null;
    }
    if (value.kind === 'url') {
      return URL_PATTERN.test(value.url) ? value.url : null;
    }
    return this.uploadPreviewUrl();
  });

  private onChange: (value: ImageValue | undefined) => void = () => {};
  private onTouched: () => void = () => {};
  private onValidatorChange: () => void = () => {};

  constructor() {
    this.urlControl.valueChanges.subscribe((raw) => {
      const trimmed = raw.trim();
      const value: ImageValue | undefined = trimmed ? { kind: 'url', url: trimmed } : undefined;
      this.currentValue.set(value);
      this.onChange(value);
      this.onValidatorChange();
    });

    effect(() => {
      const value = this.currentValue();
      if (value?.kind === 'upload') {
        const objectUrl = URL.createObjectURL(value.file);
        const previous = this.previousObjectUrl;
        this.previousObjectUrl = objectUrl;
        this.uploadPreviewUrl.set(objectUrl);
        if (previous) {
          URL.revokeObjectURL(previous);
        }
      } else if (this.previousObjectUrl) {
        URL.revokeObjectURL(this.previousObjectUrl);
        this.previousObjectUrl = null;
        this.uploadPreviewUrl.set(null);
      }
    });

    this.destroyRef.onDestroy(() => {
      if (this.previousObjectUrl) {
        URL.revokeObjectURL(this.previousObjectUrl);
      }
    });
  }

  writeValue(value: ImageValue | undefined): void {
    this.currentValue.set(value);
    this.mode.set(value?.kind === 'upload' ? 'upload' : 'url');
    this.urlControl.setValue(value?.kind === 'url' ? value.url : '', { emitEvent: false });
    this.fileError.set(null);
  }

  registerOnChange(fn: (value: ImageValue | undefined) => void): void {
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
      this.urlControl.disable({ emitEvent: false });
    } else {
      this.urlControl.enable({ emitEvent: false });
    }
  }

  validate(_control?: AbstractControl): ValidationErrors | null {
    const value = this.currentValue();
    if (!value || value.kind === 'upload') {
      return null;
    }
    return URL_PATTERN.test(value.url) ? null : { invalidImage: true };
  }

  onBlur(): void {
    this.onTouched();
  }

  setMode(event: MatButtonToggleChange): void {
    this.mode.set(event.value as ImageInputMode);
  }

  triggerFilePicker(): void {
    this.fileInputRef()?.nativeElement.click();
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }

    if (!ACCEPTED_IMAGE_MIME_TYPES.includes(file.type)) {
      this.fileError.set('invalidType');
    } else if (file.size > MAX_IMAGE_SIZE_BYTES) {
      this.fileError.set('tooLarge');
    } else {
      this.fileError.set(null);
      const value: ImageValue = { kind: 'upload', file };
      this.currentValue.set(value);
      this.onChange(value);
      this.onValidatorChange();
    }

    input.value = '';
  }
}

import { ChangeDetectionStrategy, Component, computed, forwardRef, inject, input, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { COUNTRY_CODES, countryDisplayName } from '../../../../shared/models/country.model';
import { LanguageService } from '../../../../core/i18n/language.service';

interface CountryOption {
  code: string;
  label: string;
}

@Component({
  selector: 'app-country-select',
  imports: [],
  templateUrl: './country-select.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => CountrySelect), multi: true },
  ],
})
export class CountrySelect implements ControlValueAccessor {
  protected readonly language = inject(LanguageService);

  readonly inputId = input('country-select-filter');

  protected readonly filterText = signal('');
  protected readonly highlightedIndex = signal(0);
  protected readonly isOpen = signal(false);
  protected readonly disabled = signal(false);
  private readonly selectedCodes = signal<string[]>([]);

  private readonly allOptions = computed<CountryOption[]>(() => {
    const uiLanguage = this.language.language();
    return [...COUNTRY_CODES]
      .map((code) => ({ code, label: countryDisplayName(code, uiLanguage) }))
      .sort((a, b) => a.label.localeCompare(b.label));
  });

  protected readonly selectedOptions = computed<CountryOption[]>(() => {
    const selected = new Set(this.selectedCodes());
    return this.allOptions().filter((option) => selected.has(option.code));
  });

  protected readonly filteredOptions = computed<CountryOption[]>(() => {
    const selected = new Set(this.selectedCodes());
    const query = this.filterText().trim().toLowerCase();
    return this.allOptions()
      .filter((option) => !selected.has(option.code))
      .filter((option) => !query || option.label.toLowerCase().includes(query));
  });

  private onChange: (value: string[]) => void = () => {};
  private onTouched: () => void = () => {};

  writeValue(value: string[] | null): void {
    this.selectedCodes.set(value ?? []);
  }

  registerOnChange(fn: (value: string[]) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
  }

  protected onFocus(): void {
    this.isOpen.set(true);
  }

  protected onBlur(): void {
    this.isOpen.set(false);
    this.onTouched();
  }

  protected onFilterInput(value: string): void {
    this.filterText.set(value);
    this.highlightedIndex.set(0);
  }

  protected onFilterKeydown(event: KeyboardEvent): void {
    const options = this.filteredOptions();
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.highlightedIndex.update((i) => Math.min(i + 1, options.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.highlightedIndex.update((i) => Math.max(i - 1, 0));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const option = options[this.highlightedIndex()];
      if (option) {
        this.select(option.code);
      }
    } else if (event.key === 'Escape') {
      this.filterText.set('');
    }
  }

  protected select(code: string): void {
    const next = [...this.selectedCodes(), code];
    this.selectedCodes.set(next);
    this.filterText.set('');
    this.highlightedIndex.set(0);
    this.onChange(next);
  }

  protected remove(code: string): void {
    const next = this.selectedCodes().filter((c) => c !== code);
    this.selectedCodes.set(next);
    this.onChange(next);
  }

  protected optionId(code: string): string {
    return `${this.inputId()}-option-${code}`;
  }
}

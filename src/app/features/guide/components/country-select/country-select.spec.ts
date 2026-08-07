import { TestBed } from '@angular/core/testing';
import { CountrySelect } from './country-select';
import { LanguageService } from '../../../../core/i18n/language.service';

describe('CountrySelect', () => {
  let language: LanguageService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    language = TestBed.inject(LanguageService);
    language.setLanguage('es');
  });

  function createFixture() {
    const fixture = TestBed.createComponent(CountrySelect);
    fixture.detectChanges();
    return fixture;
  }

  function filterInput(fixture: ReturnType<typeof createFixture>) {
    return fixture.nativeElement.querySelector(
      '[data-testid="country-filter-input"]',
    ) as HTMLInputElement;
  }

  function focusAndType(fixture: ReturnType<typeof createFixture>, text: string) {
    const input = filterInput(fixture);
    input.dispatchEvent(new Event('focus'));
    input.value = text;
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }

  function keydown(fixture: ReturnType<typeof createFixture>, key: string) {
    filterInput(fixture).dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
    fixture.detectChanges();
  }

  function option(fixture: ReturnType<typeof createFixture>, code: string) {
    return fixture.nativeElement.querySelector(
      `[data-testid="country-option-${code}"]`,
    ) as HTMLElement | null;
  }

  function chip(fixture: ReturnType<typeof createFixture>, code: string) {
    return fixture.nativeElement.querySelector(
      `[data-testid="country-chip-${code}"]`,
    ) as HTMLElement | null;
  }

  function chipRemove(fixture: ReturnType<typeof createFixture>, code: string) {
    return fixture.nativeElement.querySelector(
      `[data-testid="country-chip-remove-${code}"]`,
    ) as HTMLButtonElement | null;
  }

  it('renders no chips and no listbox before the input is focused', () => {
    const fixture = createFixture();

    expect(fixture.nativeElement.querySelectorAll('[data-testid^="country-chip-"]')).toHaveLength(0);
    expect(fixture.nativeElement.querySelector('[role="listbox"]')).toBeNull();
  });

  it('filters the listbox by the localized country name as the user types', () => {
    const fixture = createFixture();

    focusAndType(fixture, 'Argentin');

    expect(option(fixture, 'AR')).not.toBeNull();
    expect(option(fixture, 'BR')).toBeNull();
  });

  it('filtering is case-insensitive', () => {
    const fixture = createFixture();

    focusAndType(fixture, 'argentin');

    expect(option(fixture, 'AR')).not.toBeNull();
  });

  it('selecting an option via click adds a chip, clears the filter, and removes it from the list', () => {
    const fixture = createFixture();
    const onChange = vi.fn();
    fixture.componentInstance.registerOnChange(onChange);
    focusAndType(fixture, 'Argentin');

    option(fixture, 'AR')!.click();
    fixture.detectChanges();

    expect(chip(fixture, 'AR')).not.toBeNull();
    expect(filterInput(fixture).value).toBe('');
    expect(onChange).toHaveBeenCalledWith(['AR']);
    focusAndType(fixture, 'Argentin');
    expect(option(fixture, 'AR')).toBeNull();
  });

  it('ArrowDown/ArrowUp move the highlighted option, and Enter selects it', () => {
    const fixture = createFixture();
    const onChange = vi.fn();
    fixture.componentInstance.registerOnChange(onChange);
    focusAndType(fixture, 'lia');
    const firstMatch = fixture.componentInstance['filteredOptions']()[0];
    const secondMatch = fixture.componentInstance['filteredOptions']()[1];

    keydown(fixture, 'ArrowDown');
    keydown(fixture, 'Enter');

    expect(onChange).toHaveBeenCalledWith([secondMatch.code]);
    expect(chip(fixture, firstMatch.code)).toBeNull();
    expect(chip(fixture, secondMatch.code)).not.toBeNull();
  });

  it('Escape clears the filter text', () => {
    const fixture = createFixture();
    focusAndType(fixture, 'Argentin');

    keydown(fixture, 'Escape');

    expect(filterInput(fixture).value).toBe('');
  });

  it('removes a selected country immediately when its chip remove button is clicked, without confirmation', () => {
    const fixture = createFixture();
    const onChange = vi.fn();
    fixture.componentInstance.writeValue(['AR', 'BR']);
    fixture.detectChanges();
    fixture.componentInstance.registerOnChange(onChange);

    chipRemove(fixture, 'AR')!.click();
    fixture.detectChanges();

    expect(chip(fixture, 'AR')).toBeNull();
    expect(chip(fixture, 'BR')).not.toBeNull();
    expect(onChange).toHaveBeenCalledWith(['BR']);
    focusAndType(fixture, 'Argentin');
    expect(option(fixture, 'AR')).not.toBeNull();
  });

  it('writeValue populates the initial chips', () => {
    const fixture = createFixture();

    fixture.componentInstance.writeValue(['AR', 'BR']);
    fixture.detectChanges();

    expect(chip(fixture, 'AR')?.textContent).toContain('Argentina');
    expect(chip(fixture, 'BR')?.textContent).toContain('Brasil');
  });

  it('writeValue with null resets to no selection', () => {
    const fixture = createFixture();
    fixture.componentInstance.writeValue(['AR']);
    fixture.detectChanges();

    fixture.componentInstance.writeValue(null);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('[data-testid^="country-chip-"]')).toHaveLength(0);
  });

  it('notifies onTouched on blur', () => {
    const fixture = createFixture();
    const onTouched = vi.fn();
    fixture.componentInstance.registerOnTouched(onTouched);

    filterInput(fixture).dispatchEvent(new Event('blur'));

    expect(onTouched).toHaveBeenCalled();
  });

  it('disables the filter input and chip remove buttons when setDisabledState(true)', () => {
    const fixture = createFixture();
    fixture.componentInstance.writeValue(['AR']);
    fixture.componentInstance.setDisabledState(true);
    fixture.detectChanges();

    expect(filterInput(fixture).disabled).toBe(true);
    expect(chipRemove(fixture, 'AR')?.disabled).toBe(true);
  });
});

import { TestBed } from '@angular/core/testing';
import { SelectionToolbar } from './selection-toolbar';
import { LanguageService } from '../../../core/i18n/language.service';

describe('SelectionToolbar', () => {
  let language: LanguageService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    language = TestBed.inject(LanguageService);
    language.setLanguage('en');
  });

  function createFixture(selectedCount: number) {
    const fixture = TestBed.createComponent(SelectionToolbar);
    fixture.componentRef.setInput('selectedCount', selectedCount);
    fixture.detectChanges();
    return fixture;
  }

  it('shows the selected count', () => {
    const fixture = createFixture(3);

    expect(fixture.nativeElement.textContent).toContain(language.t().bulkSelection.selectedCountLabel(3));
  });

  it('emits deleteRequested when the delete button is clicked', () => {
    const fixture = createFixture(2);
    const deleteRequested = vi.fn();
    fixture.componentInstance.deleteRequested.subscribe(deleteRequested);

    (fixture.nativeElement.querySelector('[data-testid="bulk-delete-button"]') as HTMLButtonElement).click();

    expect(deleteRequested).toHaveBeenCalled();
  });

  it('emits clearRequested when the clear button is clicked', () => {
    const fixture = createFixture(2);
    const clearRequested = vi.fn();
    fixture.componentInstance.clearRequested.subscribe(clearRequested);

    (fixture.nativeElement.querySelector('[data-testid="bulk-clear-button"]') as HTMLButtonElement).click();

    expect(clearRequested).toHaveBeenCalled();
  });
});

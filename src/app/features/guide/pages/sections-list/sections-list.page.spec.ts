import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { CdkDragDrop, CdkDropList } from '@angular/cdk/drag-drop';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of } from 'rxjs';
import { SectionsListPage } from './sections-list.page';
import { SectionService } from '../../services/section.service';
import { Section } from '../../models/section.model';
import { LanguageService } from '../../../../core/i18n/language.service';
import { TranslationSuggestionService } from '../../../../shared/services/translation-suggestion.service';
import { FakeSectionService, makeSection } from '../../testing/fake-section-service';

class FakeIntersectionObserver implements IntersectionObserver {
  static instances: FakeIntersectionObserver[] = [];

  readonly root: Element | Document | null = null;
  readonly rootMargin: string = '';
  readonly thresholds: ReadonlyArray<number> = [];

  disconnect = vi.fn();
  observe = vi.fn();
  unobserve = vi.fn();
  takeRecords = vi.fn(() => []);

  constructor(
    public callback: IntersectionObserverCallback,
    public options?: IntersectionObserverInit,
  ) {
    FakeIntersectionObserver.instances.push(this);
  }
}

describe('SectionsListPage', () => {
  let service: FakeSectionService;
  let language: LanguageService;

  beforeEach(() => {
    FakeIntersectionObserver.instances = [];
    global.IntersectionObserver = FakeIntersectionObserver as unknown as typeof IntersectionObserver;
    service = new FakeSectionService();
    TestBed.configureTestingModule({
      providers: [
        { provide: SectionService, useValue: service },
        {
          provide: TranslationSuggestionService,
          useValue: { suggest: vi.fn(() => new Promise(() => {})) },
        },
        { provide: MatSnackBar, useValue: { open: vi.fn() } },
      ],
    });
    language = TestBed.inject(LanguageService);
    language.setLanguage('en');
  });

  function createFixture() {
    const fixture = TestBed.createComponent(SectionsListPage);
    fixture.detectChanges();
    return fixture;
  }

  function seedSection(slug: string, title = slug, overrides: Partial<Section> = {}): Section {
    return makeSection({
      slug,
      translations: { en: { title, description: '' } },
      ...overrides,
    });
  }

  it('shows the page heading', () => {
    const fixture = createFixture();

    expect(fixture.nativeElement.querySelector('h1')?.textContent?.trim()).toBe(
      language.t().guide.sectionsList.heading,
    );
  });

  it('renders sections from the service sorted by order', () => {
    const first = seedSection('first', 'First', { order: 1 });
    const second = seedSection('second', 'Second', { order: 0 });
    service.seed([first, second]);

    const fixture = createFixture();

    const titles = Array.from(fixture.nativeElement.querySelectorAll('[data-testid="section-title"]')).map(
      (el) => (el as HTMLElement).textContent?.trim(),
    );
    expect(titles).toEqual(['Second', 'First']);
  });

  it('shows an empty state when there are no sections', () => {
    const fixture = createFixture();

    expect(fixture.nativeElement.textContent).toContain(language.t().guide.sectionsList.emptyState);
  });

  it('binds the rendered drop list data to the current sections so real drops carry data', () => {
    service.seed([seedSection('a', 'A', { order: 0 }), seedSection('b', 'B', { order: 1 })]);
    const fixture = createFixture();

    const dropList = fixture.debugElement.query(By.directive(CdkDropList)).injector.get(CdkDropList);

    expect(dropList.data).toEqual(service.sections());
  });

  it('reorders sections through the service when a drop occurs', async () => {
    const a = seedSection('a', 'A', { order: 0 });
    const b = seedSection('b', 'B', { order: 1 });
    const c = seedSection('c', 'C', { order: 2 });
    service.seed([a, b, c]);
    const fixture = createFixture();
    const component = fixture.componentInstance;

    const sections: Section[] = service.sections();
    component.onDrop({
      previousIndex: 0,
      currentIndex: 2,
      container: { data: sections },
    } as CdkDragDrop<Section[]>);
    await Promise.resolve();
    await Promise.resolve();

    expect(service.sections().map((s) => s.slug)).toEqual([b.slug, c.slug, a.slug]);
  });

  it('opens the drawer in create mode, targeting the current UI language, when "New section" is clicked', () => {
    const fixture = createFixture();

    const newButton = fixture.nativeElement.querySelector(
      '[data-testid="new-section-button"]',
    ) as HTMLButtonElement;
    newButton.click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('app-section-form-drawer')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('[data-testid="save-button"]')).not.toBeNull();
  });

  it('opens the drawer in edit mode with the selected section and language when Edit is clicked', () => {
    service.seed([seedSection('editable', 'Editable')]);
    const fixture = createFixture();

    const editButton = fixture.nativeElement.querySelector(
      '[data-testid="edit-button"]',
    ) as HTMLButtonElement;
    editButton.click();
    fixture.detectChanges();

    const titleInput = fixture.nativeElement.querySelector('input[formcontrolname="title"]') as HTMLInputElement;
    expect(titleInput.value).toBe('Editable');
  });

  it('passes the stale source language through to the drawer when editing a language flagged as needing an update', () => {
    const section = seedSection('multi', 'Getting started v2', {
      translations: {
        en: { title: 'Getting started v2', description: '' },
        es: { title: 'Empezando', description: '' },
      },
      staleLanguages: { es: 'en' },
    });
    service.seed([section]);
    const fixture = createFixture();
    const component = fixture.componentInstance;

    component['openEdit']({ section, targetLanguage: 'es', staleSourceLanguage: 'en' });
    fixture.detectChanges();

    expect(component['drawerStaleSourceLanguage']()).toBe('en');
  });

  it('does not carry a stale source language when editing an up-to-date translation', () => {
    service.seed([seedSection('editable', 'Editable')]);
    const fixture = createFixture();

    const editButton = fixture.nativeElement.querySelector(
      '[data-testid="edit-button"]',
    ) as HTMLButtonElement;
    editButton.click();
    fixture.detectChanges();

    expect(fixture.componentInstance['drawerStaleSourceLanguage']()).toBeUndefined();
  });

  it('closes the drawer when the form emits saved', () => {
    const fixture = createFixture();
    fixture.nativeElement.querySelector('[data-testid="new-section-button"]').click();
    fixture.detectChanges();

    fixture.componentInstance.onSaved();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('app-section-form-drawer')).toBeNull();
  });

  it('closes the drawer when the form emits cancelled', () => {
    const fixture = createFixture();
    fixture.nativeElement.querySelector('[data-testid="new-section-button"]').click();
    fixture.detectChanges();

    (fixture.nativeElement.querySelector('[data-testid="cancel-button"]') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('app-section-form-drawer')).toBeNull();
  });

  it("reverts a row's language selector when a translate flow is cancelled", () => {
    service.seed([
      seedSection('multi', 'Getting started', {
        translations: {
          en: { title: 'Getting started', description: '' },
          fr: { title: 'Pour commencer', description: '' },
        },
      }),
    ]);
    const fixture = createFixture();

    (fixture.nativeElement.querySelector('[data-testid="language-tag-es"]') as HTMLElement).click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('app-section-form-drawer')).not.toBeNull();

    (fixture.nativeElement.querySelector('[data-testid="cancel-button"]') as HTMLButtonElement).click();
    fixture.detectChanges();

    const enTag = fixture.nativeElement.querySelector('[data-testid="language-tag-en"]') as HTMLElement;
    expect(enTag.className).toContain('ring');
  });

  describe('bulk selection', () => {
    it('hides the selection toolbar when nothing is selected', () => {
      service.seed([seedSection('a', 'A')]);
      const fixture = createFixture();

      expect(fixture.nativeElement.querySelector('app-selection-toolbar')).toBeNull();
    });

    it('shows the selection toolbar with the selected count once an item is checked', () => {
      service.seed([seedSection('a', 'A')]);
      const fixture = createFixture();

      (
        fixture.nativeElement.querySelector('[data-testid="select-checkbox"] input') as HTMLInputElement
      ).click();
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('app-selection-toolbar')).not.toBeNull();
      expect(fixture.componentInstance['selectedCount']()).toBe(1);
    });

    it('deletes the selected sections via the service after confirming', async () => {
      const a = seedSection('a', 'A');
      const b = seedSection('b', 'B');
      service.seed([a, b]);
      const fixture = createFixture();
      const dialog = TestBed.inject(MatDialog);
      vi.spyOn(dialog, 'open').mockReturnValue({ afterClosed: () => of(true) } as ReturnType<MatDialog['open']>);

      fixture.componentInstance['toggleSelection'](a.id);
      fixture.componentInstance['requestBulkDelete']();
      await Promise.resolve();
      await Promise.resolve();

      expect(service.delete).toHaveBeenCalledWith(a.id);
      expect(fixture.componentInstance['selectedCount']()).toBe(0);
    });

    it('does not delete when the confirm dialog is cancelled', () => {
      const a = seedSection('a', 'A');
      service.seed([a]);
      const fixture = createFixture();
      const dialog = TestBed.inject(MatDialog);
      vi.spyOn(dialog, 'open').mockReturnValue({ afterClosed: () => of(false) } as ReturnType<MatDialog['open']>);

      fixture.componentInstance['toggleSelection'](a.id);
      fixture.componentInstance['requestBulkDelete']();

      expect(service.delete).not.toHaveBeenCalled();
    });

    it('shows an error notice and keeps the selection when the bulk delete fails', async () => {
      const a = seedSection('a', 'A');
      service.seed([a]);
      service.delete.mockRejectedValueOnce(new Error('network error'));
      const fixture = createFixture();
      const dialog = TestBed.inject(MatDialog);
      vi.spyOn(dialog, 'open').mockReturnValue({ afterClosed: () => of(true) } as ReturnType<MatDialog['open']>);
      const snackBar = TestBed.inject(MatSnackBar);

      fixture.componentInstance['toggleSelection'](a.id);
      fixture.componentInstance['requestBulkDelete']();
      await Promise.resolve();
      await Promise.resolve();

      expect(snackBar.open).toHaveBeenCalled();
      expect(fixture.componentInstance['selectedCount']()).toBe(1);
    });
  });

  describe('status filter', () => {
    it('narrows the rendered grid to the selected status', () => {
      const draftSection = seedSection('draft-section', 'Draft', { status: 'draft' });
      const publishedSection = seedSection('published-section', 'Published', { status: 'published' });
      service.seed([draftSection, publishedSection]);
      const fixture = createFixture();

      fixture.componentInstance['statusFilter'].set('published');
      fixture.detectChanges();

      const titles = Array.from(
        fixture.nativeElement.querySelectorAll('[data-testid="section-title"]'),
      ).map((el) => (el as HTMLElement).textContent?.trim());
      expect(titles).toEqual(['Published']);
    });

    it('disables drag-and-drop and move buttons when filtering to a specific status', () => {
      service.seed([
        seedSection('a', 'A', { order: 0, status: 'draft' }),
        seedSection('b', 'B', { order: 1, status: 'draft' }),
      ]);
      const fixture = createFixture();

      fixture.componentInstance['statusFilter'].set('draft');
      fixture.detectChanges();

      const dropList = fixture.debugElement.query(By.directive(CdkDropList)).injector.get(CdkDropList);
      expect(dropList.disabled).toBe(true);

      const moveUpButton = fixture.nativeElement.querySelector(
        '[data-testid="move-up-button"]',
      ) as HTMLButtonElement;
      expect(moveUpButton.disabled).toBe(true);
    });

    it('keeps drag-and-drop and move buttons enabled for the first item when filtering to "all"', () => {
      service.seed([seedSection('a', 'A', { order: 0 }), seedSection('b', 'B', { order: 1 })]);
      const fixture = createFixture();

      const dropList = fixture.debugElement.query(By.directive(CdkDropList)).injector.get(CdkDropList);
      expect(dropList.disabled).toBe(false);

      const moveDownButtons = fixture.nativeElement.querySelectorAll(
        '[data-testid="move-down-button"]',
      ) as NodeListOf<HTMLButtonElement>;
      expect(moveDownButtons[0].disabled).toBe(false);
    });
  });

  describe('reorder buttons', () => {
    it('moves a middle section to the top via the service', async () => {
      const a = seedSection('a', 'A', { order: 0 });
      const b = seedSection('b', 'B', { order: 1 });
      const c = seedSection('c', 'C', { order: 2 });
      service.seed([a, b, c]);
      const fixture = createFixture();

      fixture.componentInstance['onMoveToTop'](b.id);
      await Promise.resolve();
      await Promise.resolve();

      expect(service.sections().map((s) => s.slug)).toEqual([b.slug, a.slug, c.slug]);
    });

    it('moves a middle section up via the service', async () => {
      const a = seedSection('a', 'A', { order: 0 });
      const b = seedSection('b', 'B', { order: 1 });
      const c = seedSection('c', 'C', { order: 2 });
      service.seed([a, b, c]);
      const fixture = createFixture();

      fixture.componentInstance['onMoveUp'](c.id);
      await Promise.resolve();
      await Promise.resolve();

      expect(service.sections().map((s) => s.slug)).toEqual([a.slug, c.slug, b.slug]);
    });

    it('moves a middle section down via the service', async () => {
      const a = seedSection('a', 'A', { order: 0 });
      const b = seedSection('b', 'B', { order: 1 });
      const c = seedSection('c', 'C', { order: 2 });
      service.seed([a, b, c]);
      const fixture = createFixture();

      fixture.componentInstance['onMoveDown'](a.id);
      await Promise.resolve();
      await Promise.resolve();

      expect(service.sections().map((s) => s.slug)).toEqual([b.slug, a.slug, c.slug]);
    });

    it('shows an error notice when a move action fails', async () => {
      const a = seedSection('a', 'A', { order: 0 });
      const b = seedSection('b', 'B', { order: 1 });
      service.seed([a, b]);
      service.reorder.mockRejectedValueOnce(new Error('network error'));
      const fixture = createFixture();
      const snackBar = TestBed.inject(MatSnackBar);

      fixture.componentInstance['onMoveUp'](b.id);
      await Promise.resolve();
      await Promise.resolve();

      expect(snackBar.open).toHaveBeenCalled();
    });
  });

  describe('infinite scroll', () => {
    function seedMany(count: number): Section[] {
      const sections = Array.from({ length: count }, (_, i) =>
        seedSection(`section-${i}`, `Section ${i}`, { order: i }),
      );
      service.seed(sections);
      return sections;
    }

    it('renders only the first page of sections initially', () => {
      seedMany(30);
      const fixture = createFixture();

      expect(fixture.nativeElement.querySelectorAll('[data-testid="section-title"]').length).toBe(24);
    });

    it('renders more sections when the sentinel reports it is near the end', () => {
      seedMany(30);
      const fixture = createFixture();

      fixture.componentInstance['onNearEnd']();
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelectorAll('[data-testid="section-title"]').length).toBe(30);
    });

    it('does not reset the visible window when the underlying data changes without a filter change', async () => {
      const sections = seedMany(30);
      const fixture = createFixture();

      fixture.componentInstance['onNearEnd']();
      fixture.detectChanges();
      expect(fixture.componentInstance['visibleCount']()).toBe(48);

      fixture.componentInstance.onDrop({
        previousIndex: 0,
        currentIndex: 1,
        container: { data: sections },
      } as CdkDragDrop<Section[]>);
      await Promise.resolve();
      await Promise.resolve();
      fixture.detectChanges();

      expect(fixture.componentInstance['visibleCount']()).toBe(48);
    });

    it('resets the visible window when the status filter changes', () => {
      seedMany(30);
      const fixture = createFixture();

      fixture.componentInstance['onNearEnd']();
      fixture.detectChanges();
      expect(fixture.componentInstance['visibleCount']()).toBe(48);

      fixture.componentInstance['statusFilter'].set('draft');
      fixture.detectChanges();

      expect(fixture.componentInstance['visibleCount']()).toBe(24);
    });
  });
});

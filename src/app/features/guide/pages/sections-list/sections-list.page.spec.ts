import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { CdkDragDrop, CdkDropList } from '@angular/cdk/drag-drop';
import { SectionsListPage } from './sections-list.page';
import { SectionService } from '../../services/section.service';
import { Section } from '../../models/section.model';
import { LanguageService } from '../../../../core/i18n/language.service';
import { TranslationSuggestionService } from '../../../../shared/services/translation-suggestion.service';

describe('SectionsListPage', () => {
  let service: SectionService;
  let language: LanguageService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        {
          provide: TranslationSuggestionService,
          useValue: { suggest: vi.fn(() => new Promise(() => {})) },
        },
      ],
    });
    service = TestBed.inject(SectionService);
    language = TestBed.inject(LanguageService);
    language.setLanguage('en');
  });

  function createFixture() {
    const fixture = TestBed.createComponent(SectionsListPage);
    fixture.detectChanges();
    return fixture;
  }

  function createSection(slug: string, title = slug) {
    return service.create({
      slug,
      imageUrl: '',
      language: 'en',
      translation: { title, description: '' },
    });
  }

  it('shows the page heading', () => {
    const fixture = createFixture();

    expect(fixture.nativeElement.querySelector('h1')?.textContent?.trim()).toBe(
      language.t().guide.sectionsList.heading,
    );
  });

  it('renders sections from the service sorted by order', () => {
    createSection('first', 'First');
    const second = createSection('second', 'Second');
    const first = service.sections().find((s) => s.slug === 'first')!;
    service.reorder([second.slug, first.slug]);

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
    createSection('a', 'A');
    createSection('b', 'B');
    const fixture = createFixture();

    const dropList = fixture.debugElement.query(By.directive(CdkDropList)).injector.get(CdkDropList);

    expect(dropList.data).toEqual(service.sections());
  });

  it('reorders sections through the service when a drop occurs', () => {
    const a = createSection('a', 'A');
    const b = createSection('b', 'B');
    const c = createSection('c', 'C');
    const fixture = createFixture();
    const component = fixture.componentInstance;

    const sections: Section[] = service.sections();
    component.onDrop({
      previousIndex: 0,
      currentIndex: 2,
      container: { data: sections },
    } as CdkDragDrop<Section[]>);

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
    createSection('editable', 'Editable');
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
    const created = createSection('multi', 'Getting started');
    service.saveTranslation(created.slug, {
      slug: created.slug,
      imageUrl: '',
      language: 'es',
      translation: { title: 'Empezando', description: '' },
    });
    service.saveTranslation(created.slug, {
      slug: created.slug,
      imageUrl: '',
      language: 'en',
      translation: { title: 'Getting started v2', description: '' },
    });
    const section = service.sections()[0];
    expect(section.staleLanguages).toEqual({ es: 'en' });
    const fixture = createFixture();
    const component = fixture.componentInstance;

    component['openEdit']({ section, targetLanguage: 'es', staleSourceLanguage: 'en' });
    fixture.detectChanges();

    expect(component['drawerStaleSourceLanguage']()).toBe('en');
  });

  it('does not carry a stale source language when editing an up-to-date translation', () => {
    createSection('editable', 'Editable');
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
    const created = createSection('multi', 'Getting started');
    service.saveTranslation(created.slug, {
      slug: created.slug,
      imageUrl: '',
      language: 'fr',
      translation: { title: 'Pour commencer', description: '' },
    });
    const fixture = createFixture();

    (fixture.nativeElement.querySelector('[data-testid="language-tag-es"]') as HTMLElement).click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('app-section-form-drawer')).not.toBeNull();

    (fixture.nativeElement.querySelector('[data-testid="cancel-button"]') as HTMLButtonElement).click();
    fixture.detectChanges();

    const enTag = fixture.nativeElement.querySelector('[data-testid="language-tag-en"]') as HTMLElement;
    expect(enTag.className).toContain('ring');
  });
});

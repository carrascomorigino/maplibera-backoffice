import { TestBed } from '@angular/core/testing';
import { CdkDragDrop, CdkDropList } from '@angular/cdk/drag-drop';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ProfessionalsListPage } from './professionals-list.page';
import { ProfessionalService } from '../../services/professional.service';
import { TranslationSuggestionService } from '../../../../shared/services/translation-suggestion.service';
import { LanguageService } from '../../../../core/i18n/language.service';
import { Professional, ProfessionalSpecialty } from '../../models/professional.model';
import { FakeProfessionalService, makeProfessional } from '../../testing/fake-professional-service';

describe('ProfessionalsListPage', () => {
  let service: FakeProfessionalService;

  beforeEach(() => {
    service = new FakeProfessionalService();
    TestBed.configureTestingModule({
      providers: [
        { provide: ProfessionalService, useValue: service },
        { provide: TranslationSuggestionService, useValue: { suggest: vi.fn(() => new Promise(() => {})) } },
        { provide: MatSnackBar, useValue: { open: vi.fn() } },
      ],
    });
    TestBed.inject(LanguageService);
  });

  function createFixture() {
    const fixture = TestBed.createComponent(ProfessionalsListPage);
    fixture.detectChanges();
    return fixture;
  }

  function professionalFixture(specialty: ProfessionalSpecialty, slug: string, order = 0): Professional {
    const sharedFields: Record<string, unknown> = {
      nutritionist: { licenseNumber: 'AB1', dietarySpecialties: [] },
      doctor: { medicalLicenseNumber: 'MD1', medicalSpecialty: 'General' },
      dentist: { licenseNumber: 'DDS1', acceptsChildren: false },
      coach: { certifications: [], coachingAreas: [] },
    }[specialty]!;
    return makeProfessional({
      specialty,
      slug,
      order,
      translations: { en: { name: slug, credentialsTitle: '', bio: '' } },
      ...sharedFields,
    } as Partial<Professional>);
  }

  it('shows an empty-specialty state for each specialty with no professionals', () => {
    const fixture = createFixture();

    expect(
      fixture.nativeElement.querySelectorAll('[data-testid^="empty-specialty-"]').length,
    ).toBe(4);
  });

  it('groups professionals into their specialty section', () => {
    service.seed([professionalFixture('nutritionist', 'jane-doe'), professionalFixture('doctor', 'john-smith')]);
    const fixture = createFixture();

    expect(
      fixture.nativeElement.querySelector('[data-testid="specialty-section-nutritionist"]')?.textContent,
    ).toContain('jane-doe');
    expect(
      fixture.nativeElement.querySelector('[data-testid="specialty-section-doctor"]')?.textContent,
    ).toContain('john-smith');
  });

  it('filters to a single specialty when a filter option is selected', () => {
    service.seed([professionalFixture('nutritionist', 'jane-doe'), professionalFixture('doctor', 'john-smith')]);
    const fixture = createFixture();

    fixture.componentInstance['activeFilter'].set('nutritionist');
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[data-testid="specialty-section-nutritionist"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('[data-testid="specialty-section-doctor"]')).toBeNull();
  });

  it('opens the drawer with the specialty locked when an "add" button is clicked', () => {
    const fixture = createFixture();

    (
      fixture.nativeElement.querySelector('[data-testid="add-nutritionist-button"]') as HTMLButtonElement
    ).click();
    fixture.detectChanges();

    const drawer = fixture.nativeElement.querySelector('app-professional-form-drawer');
    expect(drawer).not.toBeNull();
    expect(fixture.componentInstance['drawerContext']()).toEqual({ mode: 'create', specialty: 'nutritionist' });
  });

  it('reorders professionals within a specialty via drag-and-drop without touching other specialties', async () => {
    const a = professionalFixture('nutritionist', 'a', 0);
    const b = professionalFixture('nutritionist', 'b', 1);
    const c = professionalFixture('nutritionist', 'c', 2);
    const doctor = professionalFixture('doctor', 'a-doctor', 0);
    service.seed([a, b, c, doctor]);
    const fixture = createFixture();

    const event = {
      previousIndex: 0,
      currentIndex: 2,
      container: { data: [a, b, c] as Professional[] },
    } as unknown as CdkDragDrop<Professional[]>;
    fixture.componentInstance.onDrop('nutritionist', event);
    await Promise.resolve();
    await Promise.resolve();

    const bySlug = new Map(service.professionals().map((p) => [p.slug, p.order]));
    expect(bySlug.get('b')).toBe(0);
    expect(bySlug.get('c')).toBe(1);
    expect(bySlug.get('a')).toBe(2);
    expect(bySlug.get(doctor.slug)).toBe(0);
  });

  it('closes the drawer when the form emits saved', () => {
    const fixture = createFixture();
    (
      fixture.nativeElement.querySelector('[data-testid="add-nutritionist-button"]') as HTMLButtonElement
    ).click();
    fixture.detectChanges();

    fixture.componentInstance['onSaved']();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('app-professional-form-drawer')).toBeNull();
  });
});

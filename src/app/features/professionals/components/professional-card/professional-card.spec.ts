import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of } from 'rxjs';
import { ProfessionalCard } from './professional-card';
import { ProfessionalService } from '../../services/professional.service';
import { LanguageService } from '../../../../core/i18n/language.service';
import { Professional, ProfessionalSpecialty } from '../../models/professional.model';
import { FakeProfessionalService, makeProfessional } from '../../testing/fake-professional-service';

describe('ProfessionalCard', () => {
  let service: FakeProfessionalService;
  let language: LanguageService;
  let snackBarOpen: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    service = new FakeProfessionalService();
    snackBarOpen = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        { provide: ProfessionalService, useValue: service },
        { provide: MatSnackBar, useValue: { open: snackBarOpen } },
      ],
    });
    language = TestBed.inject(LanguageService);
  });

  function createFixture(professional: Professional) {
    const fixture = TestBed.createComponent(ProfessionalCard);
    fixture.componentRef.setInput('professional', professional);
    fixture.detectChanges();
    return fixture;
  }

  function professionalWith(overrides: {
    specialty?: ProfessionalSpecialty;
    scopeType?: 'global' | 'country' | 'city';
    countryCode?: string;
    city?: string;
    images?: { url: string; description?: string }[];
    contactLinks?: Professional['contactLinks'];
  } = {}): Professional {
    return makeProfessional({
      specialty: overrides.specialty ?? 'nutritionist',
      slug: 'jane-doe',
      images: overrides.images ?? [{ url: 'https://example.com/jane.png' }],
      scopeType: overrides.scopeType ?? 'global',
      countryCode: overrides.countryCode,
      city: overrides.city,
      contactLinks: overrides.contactLinks ?? { website: 'https://example.com' },
      translations: {
        en: { name: 'Jane Doe', credentialsTitle: 'RD', bio: 'Plant-based nutrition specialist' },
      },
    } as Partial<Professional>);
  }

  it('shows the photo image', () => {
    const fixture = createFixture(professionalWith());

    const img = fixture.nativeElement.querySelector('[data-testid="photo-image"]') as HTMLImageElement;
    expect(img).not.toBeNull();
    expect(img.src).toBe('https://example.com/jane.png');
  });

  it('shows a placeholder when there is no photo', () => {
    const fixture = createFixture(professionalWith({ images: [] }));

    expect(fixture.nativeElement.querySelector('[data-testid="photo-image"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('[data-testid="photo-placeholder"]')).not.toBeNull();
  });

  it('shows the status badge', () => {
    const fixture = createFixture(professionalWith());

    expect(fixture.nativeElement.querySelector('[data-testid="status-badge"]')?.textContent?.trim()).toBe(
      'draft',
    );
  });

  it.each([
    ['nutritionist', 'specialtyBadgeNutritionist'],
    ['doctor', 'specialtyBadgeDoctor'],
    ['dentist', 'specialtyBadgeDentist'],
    ['coach', 'specialtyBadgeCoach'],
  ] as const)('shows the specialty badge for %s', (specialty, key) => {
    const fixture = createFixture(professionalWith({ specialty }));

    expect(fixture.nativeElement.querySelector('[data-testid="specialty-badge"]')?.textContent?.trim()).toBe(
      language.t().professionals.professionalsList[key],
    );
  });

  it('shows a Global scope badge', () => {
    const fixture = createFixture(professionalWith({ scopeType: 'global' }));

    expect(fixture.nativeElement.querySelector('[data-testid="scope-badge"]')?.textContent?.trim()).toBe(
      language.t().professionals.professionalsList.scopeGlobalLabel,
    );
  });

  it('shows the country name for a country-scoped professional', () => {
    const fixture = createFixture(professionalWith({ scopeType: 'country', countryCode: 'AR' }));

    expect(fixture.nativeElement.querySelector('[data-testid="scope-badge"]')?.textContent?.trim()).not.toBe(
      '',
    );
    expect(fixture.nativeElement.querySelector('[data-testid="scope-badge"]')?.textContent?.trim()).not.toBe(
      language.t().professionals.professionalsList.scopeGlobalLabel,
    );
  });

  it('shows the city name for a city-scoped professional', () => {
    const fixture = createFixture(professionalWith({ scopeType: 'city', city: 'Springfield' }));

    expect(fixture.nativeElement.querySelector('[data-testid="scope-badge"]')?.textContent?.trim()).toBe(
      'Springfield',
    );
  });

  it('only shows contact link icons for populated fields', () => {
    const fixture = createFixture(
      professionalWith({ contactLinks: { website: 'https://example.com', bookingUrl: 'https://cal.com/jane' } }),
    );

    expect(fixture.nativeElement.querySelector('[data-testid="contact-link-website"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('[data-testid="contact-link-booking"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('[data-testid="contact-link-instagram"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('[data-testid="contact-link-telegram"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('[data-testid="contact-link-whatsapp"]')).toBeNull();
  });

  it('toggles publish/pause via the service', async () => {
    const professional = professionalWith();
    const fixture = createFixture(professional);

    (fixture.nativeElement.querySelector(
      `[data-testid="status-action-${professional.slug}"]`,
    ) as HTMLButtonElement).click();
    await Promise.resolve();

    expect(service.publish).toHaveBeenCalledWith(professional.id);
  });

  it('shows an error notice when the status action fails', async () => {
    service.publish.mockRejectedValueOnce(new Error('network error'));
    const professional = professionalWith();
    const fixture = createFixture(professional);

    (fixture.nativeElement.querySelector(
      `[data-testid="status-action-${professional.slug}"]`,
    ) as HTMLButtonElement).click();
    await Promise.resolve();
    await Promise.resolve();

    expect(snackBarOpen).toHaveBeenCalled();
  });

  it('shows a drag handle', () => {
    const fixture = createFixture(professionalWith());

    expect(fixture.nativeElement.querySelector('[data-testid="drag-handle"]')).not.toBeNull();
  });

  it('emits editRequested when the edit button is clicked', () => {
    const professional = professionalWith();
    const fixture = createFixture(professional);
    const editRequested = vi.fn();
    fixture.componentInstance.editRequested.subscribe(editRequested);

    (fixture.nativeElement.querySelector('[data-testid="edit-button"]') as HTMLButtonElement).click();

    expect(editRequested).toHaveBeenCalledWith({
      professional,
      targetLanguage: 'en',
      staleSourceLanguage: undefined,
    });
  });

  it('removes a translation via the confirm dialog', async () => {
    const professional = professionalWith();
    const fixture = createFixture(professional);
    const dialog = TestBed.inject(MatDialog);
    vi.spyOn(dialog, 'open').mockReturnValue({ afterClosed: () => of(true) } as ReturnType<MatDialog['open']>);

    fixture.componentInstance['onLanguageRemoved']('es');
    await Promise.resolve();

    expect(service.removeTranslation).toHaveBeenCalledWith(professional.id, 'es');
  });
});

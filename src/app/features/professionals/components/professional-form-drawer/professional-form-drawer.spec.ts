import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ProfessionalFormDrawer } from './professional-form-drawer';
import { ProfessionalService } from '../../services/professional.service';
import { TranslationSuggestionService } from '../../../../shared/services/translation-suggestion.service';
import { LanguageService } from '../../../../core/i18n/language.service';
import { FakeProfessionalService, makeProfessional } from '../../testing/fake-professional-service';

async function settle(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

describe('ProfessionalFormDrawer', () => {
  let service: FakeProfessionalService;
  let language: LanguageService;
  let suggestionService: { suggest: ReturnType<typeof vi.fn> };
  let snackBarOpen: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    service = new FakeProfessionalService();
    suggestionService = { suggest: vi.fn() };
    snackBarOpen = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        provideNoopAnimations(),
        { provide: ProfessionalService, useValue: service },
        { provide: TranslationSuggestionService, useValue: suggestionService },
        { provide: MatSnackBar, useValue: { open: snackBarOpen } },
      ],
    });
    language = TestBed.inject(LanguageService);
  });

  function createFixture(
    specialty: 'nutritionist' | 'doctor' | 'dentist' | 'coach' = 'nutritionist',
    targetLanguage: 'es' | 'en' | 'fr' | 'pt' = 'en',
  ) {
    const fixture = TestBed.createComponent(ProfessionalFormDrawer);
    fixture.componentRef.setInput('specialty', specialty);
    fixture.componentRef.setInput('targetLanguage', targetLanguage);
    fixture.detectChanges();
    return fixture;
  }

  function buttons(fixture: ReturnType<typeof createFixture>) {
    return {
      save: fixture.nativeElement.querySelector('[data-testid="save-button"]') as HTMLButtonElement,
      publish: fixture.nativeElement.querySelector(
        '[data-testid="publish-button"]',
      ) as HTMLButtonElement | null,
      cancel: fixture.nativeElement.querySelector('[data-testid="cancel-button"]') as HTMLButtonElement,
    };
  }

  function fillRequiredFields(component: ProfessionalFormDrawer) {
    component.form.controls.name.setValue('Jane Doe');
    component.form.controls.credentialsTitle.setValue('Registered Dietitian');
    component.form.controls.bio.setValue('Plant-based nutrition specialist');
    component.form.controls.photoUrl.setValue('https://example.com/jane.png');
    component.form.controls.specialtyFields.setValue({
      licenseNumber: 'AB123',
      dietarySpecialties: [],
    });
  }

  function existingProfessional() {
    const professional = makeProfessional({
      slug: 'existing',
      specialty: 'nutritionist',
      translations: { en: { name: 'Existing', credentialsTitle: 'RD', bio: 'Bio' } },
    });
    service.seed([professional]);
    return professional;
  }

  it('defaults scopeType to global', () => {
    const fixture = createFixture();

    expect(fixture.componentInstance.form.controls.scopeType.value).toBe('global');
  });

  it('renders the nutritionist-specific fields for the nutritionist specialty', () => {
    const fixture = createFixture('nutritionist');

    expect(
      fixture.nativeElement.querySelector('[data-testid="nutritionist-license-number"]'),
    ).not.toBeNull();
  });

  it('renders the doctor-specific fields for the doctor specialty', () => {
    const fixture = createFixture('doctor');

    expect(
      fixture.nativeElement.querySelector('[data-testid="doctor-medical-license-number"]'),
    ).not.toBeNull();
  });

  it('disables Save until required fields (including specialty fields) are filled', () => {
    const fixture = createFixture();
    const component = fixture.componentInstance;

    expect(buttons(fixture).save.disabled).toBe(true);

    fillRequiredFields(component);
    fixture.detectChanges();

    expect(buttons(fixture).save.disabled).toBe(false);
  });

  it('requires countryCode only when scopeType is country, and clears it when switching away', () => {
    const fixture = createFixture();
    const component = fixture.componentInstance;
    fillRequiredFields(component);
    fixture.detectChanges();
    expect(buttons(fixture).save.disabled).toBe(false);

    component.form.controls.scopeType.setValue('country');
    fixture.detectChanges();
    expect(component.form.controls.countryCode.hasError('countryCodeRequired')).toBe(true);
    expect(buttons(fixture).save.disabled).toBe(true);

    component.form.controls.countryCode.setValue('AR');
    fixture.detectChanges();
    expect(buttons(fixture).save.disabled).toBe(false);

    component.form.controls.scopeType.setValue('global');
    fixture.detectChanges();
    expect(component.form.controls.countryCode.value).toBeNull();
    expect(buttons(fixture).save.disabled).toBe(false);
  });

  it('requires city only when scopeType is city, and clears it when switching away', () => {
    const fixture = createFixture();
    const component = fixture.componentInstance;
    fillRequiredFields(component);
    fixture.detectChanges();

    component.form.controls.scopeType.setValue('city');
    fixture.detectChanges();
    expect(component.form.controls.city.hasError('cityRequired')).toBe(true);
    expect(buttons(fixture).save.disabled).toBe(true);

    component.form.controls.city.setValue('Springfield');
    fixture.detectChanges();
    expect(buttons(fixture).save.disabled).toBe(false);

    component.form.controls.scopeType.setValue('global');
    fixture.detectChanges();
    expect(component.form.controls.city.value).toBeNull();
  });

  it('allows contact link fields to stay empty and rejects invalid URLs', () => {
    const fixture = createFixture();
    const component = fixture.componentInstance;
    fillRequiredFields(component);
    fixture.detectChanges();
    expect(buttons(fixture).save.disabled).toBe(false);

    component.form.controls.website.setValue('not-a-url');
    fixture.detectChanges();
    expect(buttons(fixture).save.disabled).toBe(true);

    component.form.controls.website.setValue('https://example.org');
    fixture.detectChanges();
    expect(buttons(fixture).save.disabled).toBe(false);
  });

  it('shows characters remaining for the name field', () => {
    const fixture = createFixture();
    const component = fixture.componentInstance;

    component.form.controls.name.setValue('Jane Doe');
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain(
      language.t().fieldLimits.charactersRemaining(100 - 'Jane Doe'.length),
    );
  });

  it('creates a draft professional on Save', async () => {
    const fixture = createFixture();
    const component = fixture.componentInstance;
    let saved = false;
    component.saved.subscribe(() => (saved = true));

    fillRequiredFields(component);
    fixture.detectChanges();
    buttons(fixture).save.click();
    await settle();

    expect(service.professionals()).toHaveLength(1);
    expect(service.professionals()[0].specialty).toBe('nutritionist');
    expect(service.professionals()[0].status).toBe('draft');
    expect(service.professionals()[0].translations.en?.name).toBe('Jane Doe');
    expect(saved).toBe(true);
  });

  it('creates and publishes on Publish for a new professional', async () => {
    const fixture = createFixture();
    const component = fixture.componentInstance;

    fillRequiredFields(component);
    fixture.detectChanges();
    buttons(fixture).publish?.click();
    await settle();

    expect(service.professionals()[0].status).toBe('published');
  });

  it('shows an error notice when Save fails', async () => {
    service.create.mockRejectedValueOnce(new Error('network error'));
    const fixture = createFixture();
    const component = fixture.componentInstance;

    fillRequiredFields(component);
    fixture.detectChanges();
    buttons(fixture).save.click();
    await settle();

    expect(snackBarOpen).toHaveBeenCalled();
  });

  it('hides the Publish button when editing an existing professional', () => {
    const created = existingProfessional();
    const fixture = TestBed.createComponent(ProfessionalFormDrawer);
    fixture.componentRef.setInput('specialty', 'nutritionist');
    fixture.componentRef.setInput('professional', created);
    fixture.componentRef.setInput('targetLanguage', 'en');
    fixture.detectChanges();

    expect(buttons(fixture).publish).toBeNull();
  });

  it('splits shared vs. translated fields correctly on save', async () => {
    const created = existingProfessional();
    const fixture = TestBed.createComponent(ProfessionalFormDrawer);
    fixture.componentRef.setInput('specialty', 'nutritionist');
    fixture.componentRef.setInput('professional', created);
    fixture.componentRef.setInput('targetLanguage', 'en');
    fixture.detectChanges();
    const component = fixture.componentInstance;

    component.form.controls.photoUrl.setValue('https://example.com/new-photo.png');
    component.form.controls.scopeType.setValue('country');
    component.form.controls.countryCode.setValue('AR');
    component.form.controls.website.setValue('https://example.org');
    component.form.controls.name.setValue('Updated name');
    component.form.controls.specialtyFields.setValue({
      licenseNumber: 'ZZ999',
      dietarySpecialties: ['clinical'],
    });
    fixture.detectChanges();
    buttons(fixture).save.click();
    await settle();

    const updated = service.professionals()[0];
    expect(updated.photoUrl).toBe('https://example.com/new-photo.png');
    expect(updated.scopeType).toBe('country');
    expect(updated.countryCode).toBe('AR');
    expect(updated.contactLinks.website).toBe('https://example.org');
    expect(updated.translations.en?.name).toBe('Updated name');
    expect((updated as { licenseNumber: string }).licenseNumber).toBe('ZZ999');
  });

  describe('slug', () => {
    it('auto-suggests a slug from the name until manually edited', () => {
      const fixture = createFixture();
      const component = fixture.componentInstance;

      component.form.controls.name.setValue('Jane River Doe');
      fixture.detectChanges();
      expect(component.form.controls.slug.value).toBe('jane-river-doe');
    });

    it('blocks submission with a duplicate slug', () => {
      existingProfessional();
      const fixture = createFixture();
      const component = fixture.componentInstance;

      fillRequiredFields(component);
      component.form.controls.slug.setValue('existing');
      fixture.detectChanges();

      expect(component.form.controls.slug.hasError('duplicateSlug')).toBe(true);
      expect(buttons(fixture).save.disabled).toBe(true);
    });
  });

  describe('AI-suggested translation', () => {
    it('requests a suggestion when adding a new language and pre-fills on success', async () => {
      let resolveSuggest!: (value: Record<string, unknown>) => void;
      suggestionService.suggest.mockReturnValue(
        new Promise((resolve) => {
          resolveSuggest = resolve;
        }),
      );
      const existing = existingProfessional();
      const fixture = TestBed.createComponent(ProfessionalFormDrawer);
      fixture.componentRef.setInput('specialty', 'nutritionist');
      fixture.componentRef.setInput('professional', existing);
      fixture.componentRef.setInput('targetLanguage', 'es');
      fixture.componentRef.setInput('sourceLanguage', 'en');
      fixture.detectChanges();

      expect(suggestionService.suggest).toHaveBeenCalledWith(
        { language: 'en', fields: { name: 'Existing', credentialsTitle: 'RD', bio: 'Bio' } },
        'es',
      );
      expect(fixture.componentInstance.loading()).toBe(true);

      resolveSuggest({ name: 'Existente', credentialsTitle: 'RD', bio: 'Bio es' });
      await settle();
      fixture.detectChanges();

      expect(fixture.componentInstance.loading()).toBe(false);
      expect(fixture.componentInstance.form.controls.name.value).toBe('Existente');
    });

    it('does not request a suggestion when editing an already-translated language', () => {
      const existing = existingProfessional();
      const fixture = TestBed.createComponent(ProfessionalFormDrawer);
      fixture.componentRef.setInput('specialty', 'nutritionist');
      fixture.componentRef.setInput('professional', existing);
      fixture.componentRef.setInput('targetLanguage', 'en');
      fixture.detectChanges();

      expect(suggestionService.suggest).not.toHaveBeenCalled();
    });
  });

  it('shows the working-language indicator', () => {
    language.setLanguage('es');
    const fixture = createFixture('nutritionist', 'es');

    expect(fixture.nativeElement.textContent).toContain(
      language.t().professionals.professionalForm.workingLanguageLabel('Español'),
    );
  });

  it('does not call the service on Cancel', () => {
    const fixture = createFixture();
    const component = fixture.componentInstance;
    let cancelled = false;
    component.cancelled.subscribe(() => (cancelled = true));

    component.form.controls.name.setValue('Should not be saved');
    fixture.detectChanges();
    buttons(fixture).cancel.click();

    expect(service.professionals()).toHaveLength(0);
    expect(cancelled).toBe(true);
  });
});

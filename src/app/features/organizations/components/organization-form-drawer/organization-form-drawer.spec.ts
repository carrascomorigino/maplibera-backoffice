import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { MatSnackBar } from '@angular/material/snack-bar';
import { OrganizationFormDrawer } from './organization-form-drawer';
import { OrganizationService } from '../../services/organization.service';
import { TranslationSuggestionService } from '../../../../shared/services/translation-suggestion.service';
import { LanguageService } from '../../../../core/i18n/language.service';

describe('OrganizationFormDrawer', () => {
  let service: OrganizationService;
  let language: LanguageService;
  let suggestionService: { suggest: ReturnType<typeof vi.fn> };
  let snackBarOpen: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    localStorage.clear();
    suggestionService = { suggest: vi.fn() };
    snackBarOpen = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        provideNoopAnimations(),
        { provide: TranslationSuggestionService, useValue: suggestionService },
        { provide: MatSnackBar, useValue: { open: snackBarOpen } },
      ],
    });
    service = TestBed.inject(OrganizationService);
    language = TestBed.inject(LanguageService);
  });

  function createFixture(targetLanguage: 'es' | 'en' | 'fr' | 'pt' = 'en') {
    const fixture = TestBed.createComponent(OrganizationFormDrawer);
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

  function fillRequiredFields(component: OrganizationFormDrawer) {
    component.form.controls.name.setValue('Friends of the River');
    component.form.controls.description.setValue('A local river conservation group');
    component.form.controls.logoUrl.setValue('https://example.com/logo.png');
  }

  function createOrganization() {
    return service.create({
      type: 'local-group',
      slug: 'existing',
      sharedFields: { logoUrl: '', scopeType: 'global', contactLinks: {} },
      language: 'en',
      translation: { name: 'Existing', description: 'Desc' },
    });
  }

  it('defaults type to local-group and scopeType to global', () => {
    const fixture = createFixture();
    const component = fixture.componentInstance;

    expect(component.form.controls.type.value).toBe('local-group');
    expect(component.form.controls.scopeType.value).toBe('global');
  });

  it('enables the type control only when creating a new organization', () => {
    const createFixtureInstance = createFixture();
    expect(createFixtureInstance.componentInstance.form.controls.type.disabled).toBe(false);

    const created = createOrganization();
    const editFixture = TestBed.createComponent(OrganizationFormDrawer);
    editFixture.componentRef.setInput('organization', created);
    editFixture.componentRef.setInput('targetLanguage', 'en');
    editFixture.detectChanges();

    expect(editFixture.componentInstance.form.controls.type.disabled).toBe(true);
  });

  it('disables Save until name, description and logoUrl are filled', () => {
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

    component.form.controls.name.setValue('Friends of the River');
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain(
      language.t().fieldLimits.charactersRemaining(100 - 'Friends of the River'.length),
    );
  });

  it('creates a draft organization on Save', () => {
    const fixture = createFixture();
    const component = fixture.componentInstance;
    let saved = false;
    component.saved.subscribe(() => (saved = true));

    fillRequiredFields(component);
    fixture.detectChanges();
    buttons(fixture).save.click();

    expect(service.organizations()).toHaveLength(1);
    expect(service.organizations()[0].type).toBe('local-group');
    expect(service.organizations()[0].status).toBe('draft');
    expect(service.organizations()[0].translations.en?.name).toBe('Friends of the River');
    expect(saved).toBe(true);
  });

  it('creates and publishes on Publish for a new organization', () => {
    const fixture = createFixture();
    const component = fixture.componentInstance;

    fillRequiredFields(component);
    fixture.detectChanges();
    buttons(fixture).publish?.click();

    expect(service.organizations()[0].status).toBe('published');
  });

  it('hides the Publish button when editing an existing organization', () => {
    const created = createOrganization();
    const fixture = TestBed.createComponent(OrganizationFormDrawer);
    fixture.componentRef.setInput('organization', created);
    fixture.componentRef.setInput('targetLanguage', 'en');
    fixture.detectChanges();

    expect(buttons(fixture).publish).toBeNull();
  });

  it('splits shared vs. translated fields correctly on save', () => {
    const created = createOrganization();
    const fixture = TestBed.createComponent(OrganizationFormDrawer);
    fixture.componentRef.setInput('organization', created);
    fixture.componentRef.setInput('targetLanguage', 'en');
    fixture.detectChanges();
    const component = fixture.componentInstance;

    component.form.controls.logoUrl.setValue('https://example.com/new-logo.png');
    component.form.controls.scopeType.setValue('country');
    component.form.controls.countryCode.setValue('AR');
    component.form.controls.website.setValue('https://example.org');
    component.form.controls.name.setValue('Updated name');
    fixture.detectChanges();
    buttons(fixture).save.click();

    const updated = service.organizations()[0];
    expect(updated.logoUrl).toBe('https://example.com/new-logo.png');
    expect(updated.scopeType).toBe('country');
    expect(updated.countryCode).toBe('AR');
    expect(updated.contactLinks.website).toBe('https://example.org');
    expect(updated.translations.en?.name).toBe('Updated name');
  });

  describe('slug', () => {
    it('auto-suggests a slug from the name until manually edited', () => {
      const fixture = createFixture();
      const component = fixture.componentInstance;

      component.form.controls.name.setValue('River Guardians Collective');
      fixture.detectChanges();
      expect(component.form.controls.slug.value).toBe('river-guardians-collective');
    });

    it('blocks submission with a duplicate slug', () => {
      createOrganization();
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
      const existing = createOrganization();
      const fixture = TestBed.createComponent(OrganizationFormDrawer);
      fixture.componentRef.setInput('organization', existing);
      fixture.componentRef.setInput('targetLanguage', 'es');
      fixture.componentRef.setInput('sourceLanguage', 'en');
      fixture.detectChanges();

      expect(suggestionService.suggest).toHaveBeenCalledWith(
        { language: 'en', fields: { name: 'Existing', description: 'Desc' } },
        'es',
      );
      expect(fixture.componentInstance.loading()).toBe(true);

      resolveSuggest({ name: 'Existente', description: 'Desc es' });
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
      fixture.detectChanges();

      expect(fixture.componentInstance.loading()).toBe(false);
      expect(fixture.componentInstance.form.controls.name.value).toBe('Existente');
    });

    it('does not request a suggestion when editing an already-translated language', () => {
      const existing = createOrganization();
      const fixture = TestBed.createComponent(OrganizationFormDrawer);
      fixture.componentRef.setInput('organization', existing);
      fixture.componentRef.setInput('targetLanguage', 'en');
      fixture.detectChanges();

      expect(suggestionService.suggest).not.toHaveBeenCalled();
    });
  });

  it('shows the working-language indicator', () => {
    language.setLanguage('es');
    const fixture = createFixture('es');

    expect(fixture.nativeElement.textContent).toContain(
      language.t().organizations.organizationForm.workingLanguageLabel('Español'),
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

    expect(service.organizations()).toHaveLength(0);
    expect(cancelled).toBe(true);
  });
});

import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { MatSnackBar } from '@angular/material/snack-bar';
import { OrganizationFormDrawer } from './organization-form-drawer';
import { OrganizationService } from '../../services/organization.service';
import { TranslationSuggestionService } from '../../../../shared/services/translation-suggestion.service';
import { LanguageService } from '../../../../core/i18n/language.service';
import { FakeOrganizationService, makeOrganization } from '../../testing/fake-organization-service';

// A plain chain of microtask `await`s isn't deep enough here: resolving gallery images
// goes through `resolveImagePayload` (itself async) inside a `Promise.all(...).map(...)`,
// adding more microtask hops than the fixed-depth chain used elsewhere covers. Flushing at
// a macrotask boundary drains the whole microtask queue regardless of depth.
async function settle(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

describe('OrganizationFormDrawer', () => {
  let service: FakeOrganizationService;
  let language: LanguageService;
  let suggestionService: { suggest: ReturnType<typeof vi.fn> };
  let snackBarOpen: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    service = new FakeOrganizationService();
    suggestionService = { suggest: vi.fn() };
    snackBarOpen = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        provideNoopAnimations(),
        { provide: OrganizationService, useValue: service },
        { provide: TranslationSuggestionService, useValue: suggestionService },
        { provide: MatSnackBar, useValue: { open: snackBarOpen } },
      ],
    });
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
    component.form.controls.images.setValue([
      { image: { kind: 'url', url: 'https://example.com/logo.png' } },
    ]);
  }

  function existingOrganization() {
    const org = makeOrganization({
      slug: 'existing',
      type: 'local-group',
      translations: { en: { name: 'Existing', description: 'Desc' } },
    });
    service.seed([org]);
    return org;
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

    const created = existingOrganization();
    const editFixture = TestBed.createComponent(OrganizationFormDrawer);
    editFixture.componentRef.setInput('organization', created);
    editFixture.componentRef.setInput('targetLanguage', 'en');
    editFixture.detectChanges();

    expect(editFixture.componentInstance.form.controls.type.disabled).toBe(true);
  });

  it('disables Save until name, description and at least one image are filled', () => {
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

  it('creates a draft organization on Save', async () => {
    const fixture = createFixture();
    const component = fixture.componentInstance;
    let saved = false;
    component.saved.subscribe(() => (saved = true));

    fillRequiredFields(component);
    fixture.detectChanges();
    buttons(fixture).save.click();
    await settle();

    expect(service.organizations()).toHaveLength(1);
    expect(service.organizations()[0].type).toBe('local-group');
    expect(service.organizations()[0].status).toBe('draft');
    expect(service.organizations()[0].translations.en?.name).toBe('Friends of the River');
    expect(saved).toBe(true);
  });

  it('creates and publishes on Publish for a new organization', async () => {
    const fixture = createFixture();
    const component = fixture.componentInstance;

    fillRequiredFields(component);
    fixture.detectChanges();
    buttons(fixture).publish?.click();
    await settle();

    expect(service.organizations()[0].status).toBe('published');
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

  it('hides the Publish button when editing an existing organization', () => {
    const created = existingOrganization();
    const fixture = TestBed.createComponent(OrganizationFormDrawer);
    fixture.componentRef.setInput('organization', created);
    fixture.componentRef.setInput('targetLanguage', 'en');
    fixture.detectChanges();

    expect(buttons(fixture).publish).toBeNull();
  });

  it('splits shared vs. translated fields correctly on save', async () => {
    const created = existingOrganization();
    const fixture = TestBed.createComponent(OrganizationFormDrawer);
    fixture.componentRef.setInput('organization', created);
    fixture.componentRef.setInput('targetLanguage', 'en');
    fixture.detectChanges();
    const component = fixture.componentInstance;

    component.form.controls.images.setValue([
      { image: { kind: 'url', url: 'https://example.com/new-logo.png' } },
    ]);
    component.form.controls.scopeType.setValue('country');
    component.form.controls.countryCode.setValue('AR');
    component.form.controls.website.setValue('https://example.org');
    component.form.controls.name.setValue('Updated name');
    fixture.detectChanges();
    buttons(fixture).save.click();
    await settle();

    const updated = service.organizations()[0];
    expect(updated.images).toEqual([{ url: 'https://example.com/new-logo.png', description: undefined }]);
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
      existingOrganization();
      const fixture = createFixture();
      const component = fixture.componentInstance;

      fillRequiredFields(component);
      component.form.controls.slug.setValue('existing');
      fixture.detectChanges();

      expect(component.form.controls.slug.hasError('duplicateSlug')).toBe(true);
      expect(buttons(fixture).save.disabled).toBe(true);
    });
  });

  describe('image gallery', () => {
    it('requires at least one image and blocks submission until one is added', () => {
      const fixture = createFixture();
      const component = fixture.componentInstance;

      component.form.controls.name.setValue('Friends of the River');
      component.form.controls.description.setValue('A local river conservation group');
      fixture.detectChanges();

      expect(component.form.controls.images.hasError('galleryRequired')).toBe(true);
      expect(buttons(fixture).save.disabled).toBe(true);
      expect(fixture.nativeElement.querySelector('mat-error')?.textContent?.trim()).toBe(
        language.t().organizations.organizationForm.imagesRequiredError,
      );

      component.form.controls.images.setValue([
        { image: { kind: 'url', url: 'https://example.com/logo.png' } },
      ]);
      fixture.detectChanges();

      expect(component.form.controls.images.hasError('galleryRequired')).toBe(false);
      expect(buttons(fixture).save.disabled).toBe(false);
    });

    it('caps the image gallery at the default 3 images', () => {
      const fixture = createFixture();

      for (let i = 0; i < 3; i++) {
        (
          fixture.nativeElement.querySelector('[data-testid="gallery-add-button"]') as HTMLButtonElement
        ).click();
        fixture.detectChanges();
      }

      expect(fixture.nativeElement.querySelectorAll('[data-testid="gallery-row"]')).toHaveLength(3);
      expect(
        (fixture.nativeElement.querySelector('[data-testid="gallery-add-button"]') as HTMLButtonElement)
          .disabled,
      ).toBe(true);
    });
  });

  describe('video link', () => {
    it('rejects a malformed URL and accepts a valid one', () => {
      const fixture = createFixture();
      const component = fixture.componentInstance;

      fillRequiredFields(component);
      component.form.controls.videoUrl.setValue('not a url');
      fixture.detectChanges();

      expect(component.form.controls.videoUrl.hasError('pattern')).toBe(true);
      expect(buttons(fixture).save.disabled).toBe(true);

      component.form.controls.videoUrl.setValue('https://example.com/video.mp4');
      fixture.detectChanges();

      expect(component.form.controls.videoUrl.hasError('pattern')).toBe(false);
      expect(buttons(fixture).save.disabled).toBe(false);
    });

    it('round-trips through populate and persist', async () => {
      const existing = makeOrganization({
        slug: 'with-video',
        videoUrl: 'https://example.com/video.mp4',
        translations: { en: { name: 'With video', description: 'Desc' } },
      });
      service.seed([existing]);
      const fixture = TestBed.createComponent(OrganizationFormDrawer);
      fixture.componentRef.setInput('organization', existing);
      fixture.componentRef.setInput('targetLanguage', 'en');
      fixture.detectChanges();
      const component = fixture.componentInstance;

      expect(component.form.controls.videoUrl.value).toBe('https://example.com/video.mp4');

      component.form.controls.name.setValue('With video updated');
      fixture.detectChanges();
      buttons(fixture).save.click();
      await settle();

      expect(service.organizations()[0].videoUrl).toBe('https://example.com/video.mp4');
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
      const existing = existingOrganization();
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
      await settle();
      fixture.detectChanges();

      expect(fixture.componentInstance.loading()).toBe(false);
      expect(fixture.componentInstance.form.controls.name.value).toBe('Existente');
    });

    it('does not request a suggestion when editing an already-translated language', () => {
      const existing = existingOrganization();
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

import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of } from 'rxjs';
import { OrganizationListItem } from './organization-list-item';
import { OrganizationService } from '../../services/organization.service';
import { LanguageService } from '../../../../core/i18n/language.service';
import { Organization, OrganizationType } from '../../models/organization.model';
import { FakeOrganizationService, makeOrganization } from '../../testing/fake-organization-service';

describe('OrganizationListItem', () => {
  let service: FakeOrganizationService;
  let language: LanguageService;
  let snackBarOpen: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    service = new FakeOrganizationService();
    snackBarOpen = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        { provide: OrganizationService, useValue: service },
        { provide: MatSnackBar, useValue: { open: snackBarOpen } },
      ],
    });
    language = TestBed.inject(LanguageService);
  });

  function createFixture(org: Organization) {
    const fixture = TestBed.createComponent(OrganizationListItem);
    fixture.componentRef.setInput('organization', org);
    fixture.detectChanges();
    return fixture;
  }

  function orgWith(overrides: {
    type?: OrganizationType;
    scopeType?: 'global' | 'country' | 'city';
    countryCode?: string;
    city?: string;
    logoUrl?: string;
    contactLinks?: Organization['contactLinks'];
  } = {}): Organization {
    return makeOrganization({
      type: overrides.type ?? 'local-group',
      slug: 'friends-of-the-river',
      logoUrl: overrides.logoUrl ?? 'https://example.com/logo.png',
      scopeType: overrides.scopeType ?? 'global',
      countryCode: overrides.countryCode,
      city: overrides.city,
      contactLinks: overrides.contactLinks ?? { website: 'https://example.com' },
      translations: {
        en: { name: 'Friends of the River', description: 'A local river conservation group' },
      },
    });
  }

  it('shows the logo image', () => {
    const fixture = createFixture(orgWith());

    const img = fixture.nativeElement.querySelector('[data-testid="logo-image"]') as HTMLImageElement;
    expect(img).not.toBeNull();
    expect(img.src).toBe('https://example.com/logo.png');
  });

  it('shows a placeholder when there is no logo', () => {
    const fixture = createFixture(orgWith({ logoUrl: '' }));

    expect(fixture.nativeElement.querySelector('[data-testid="logo-image"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('[data-testid="logo-placeholder"]')).not.toBeNull();
  });

  it('shows the status badge', () => {
    const fixture = createFixture(orgWith());

    expect(fixture.nativeElement.querySelector('[data-testid="status-badge"]')?.textContent?.trim()).toBe(
      'draft',
    );
  });

  it.each([
    ['local-group', 'typeBadgeLocalGroup'],
    ['ngo', 'typeBadgeNgo'],
    ['social-network', 'typeBadgeSocialNetwork'],
    ['campaign', 'typeBadgeCampaign'],
  ] as const)('shows the type badge for %s', (type, key) => {
    const fixture = createFixture(orgWith({ type }));

    expect(fixture.nativeElement.querySelector('[data-testid="type-badge"]')?.textContent?.trim()).toBe(
      language.t().organizations.organizationsList[key],
    );
  });

  it('shows a Global scope badge', () => {
    const fixture = createFixture(orgWith({ scopeType: 'global' }));

    expect(fixture.nativeElement.querySelector('[data-testid="scope-badge"]')?.textContent?.trim()).toBe(
      language.t().organizations.organizationsList.scopeGlobalLabel,
    );
  });

  it('shows the country name for a country-scoped organization', () => {
    const fixture = createFixture(orgWith({ scopeType: 'country', countryCode: 'AR' }));

    expect(fixture.nativeElement.querySelector('[data-testid="scope-badge"]')?.textContent?.trim()).not.toBe(
      '',
    );
    expect(fixture.nativeElement.querySelector('[data-testid="scope-badge"]')?.textContent?.trim()).not.toBe(
      language.t().organizations.organizationsList.scopeGlobalLabel,
    );
  });

  it('shows the city name for a city-scoped organization', () => {
    const fixture = createFixture(orgWith({ scopeType: 'city', city: 'Springfield' }));

    expect(fixture.nativeElement.querySelector('[data-testid="scope-badge"]')?.textContent?.trim()).toBe(
      'Springfield',
    );
  });

  it('only shows contact link icons for populated fields', () => {
    const fixture = createFixture(
      orgWith({ contactLinks: { website: 'https://example.com', whatsapp: 'https://wa.me/123' } }),
    );

    expect(fixture.nativeElement.querySelector('[data-testid="contact-link-website"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('[data-testid="contact-link-whatsapp"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('[data-testid="contact-link-instagram"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('[data-testid="contact-link-telegram"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('[data-testid="contact-link-volunteer-form"]')).toBeNull();
  });

  it('toggles publish/pause via the service', async () => {
    const org = orgWith();
    const fixture = createFixture(org);

    (fixture.nativeElement.querySelector(
      `[data-testid="status-action-${org.slug}"]`,
    ) as HTMLButtonElement).click();
    await Promise.resolve();

    expect(service.publish).toHaveBeenCalledWith(org.id);
  });

  it('shows an error notice when the status action fails', async () => {
    service.publish.mockRejectedValueOnce(new Error('network error'));
    const org = orgWith();
    const fixture = createFixture(org);

    (fixture.nativeElement.querySelector(
      `[data-testid="status-action-${org.slug}"]`,
    ) as HTMLButtonElement).click();
    await Promise.resolve();
    await Promise.resolve();

    expect(snackBarOpen).toHaveBeenCalled();
  });

  it('emits editRequested when the edit button is clicked', () => {
    const org = orgWith();
    const fixture = createFixture(org);
    const editRequested = vi.fn();
    fixture.componentInstance.editRequested.subscribe(editRequested);

    (fixture.nativeElement.querySelector('[data-testid="edit-button"]') as HTMLButtonElement).click();

    expect(editRequested).toHaveBeenCalledWith({
      organization: org,
      targetLanguage: 'en',
      staleSourceLanguage: undefined,
    });
  });

  it('removes a translation via the confirm dialog', async () => {
    const org = orgWith({});
    const fixture = createFixture(org);
    const dialog = TestBed.inject(MatDialog);
    vi.spyOn(dialog, 'open').mockReturnValue({ afterClosed: () => of(true) } as ReturnType<MatDialog['open']>);

    fixture.componentInstance['onLanguageRemoved']('es');
    await Promise.resolve();

    expect(service.removeTranslation).toHaveBeenCalledWith(org.id, 'es');
  });
});

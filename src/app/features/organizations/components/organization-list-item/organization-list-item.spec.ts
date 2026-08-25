import { TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { OrganizationListItem } from './organization-list-item';
import { OrganizationService } from '../../services/organization.service';
import { LanguageService } from '../../../../core/i18n/language.service';
import { Organization } from '../../models/organization.model';
import { FakeOrganizationService, makeOrganization } from '../../testing/fake-organization-service';

describe('OrganizationListItem', () => {
  let service: FakeOrganizationService;
  let language: LanguageService;

  beforeEach(() => {
    service = new FakeOrganizationService();
    TestBed.configureTestingModule({
      providers: [
        { provide: OrganizationService, useValue: service },
        { provide: MatSnackBar, useValue: { open: vi.fn() } },
      ],
    });
    language = TestBed.inject(LanguageService);
    language.setLanguage('en');
  });

  function createFixture(organization: Organization, overrides: Record<string, unknown> = {}) {
    const fixture = TestBed.createComponent(OrganizationListItem);
    fixture.componentRef.setInput('organization', organization);
    for (const [key, value] of Object.entries(overrides)) {
      fixture.componentRef.setInput(key, value);
    }
    fixture.detectChanges();
    return fixture;
  }

  it('shows a drag handle', () => {
    const fixture = createFixture(makeOrganization({ slug: 'group' }));

    expect(fixture.nativeElement.querySelector('[data-testid="drag-handle"]')).not.toBeNull();
  });

  it('renders the image carousel when the organization has images', () => {
    const fixture = createFixture(
      makeOrganization({ slug: 'group', images: [{ url: 'https://example.com/a.png' }] }),
    );

    expect(fixture.nativeElement.querySelector('app-image-carousel')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('[data-testid="logo-placeholder"]')).toBeNull();
  });

  it('shows a placeholder when the organization has no images', () => {
    const fixture = createFixture(makeOrganization({ slug: 'group', images: [] }));

    expect(fixture.nativeElement.querySelector('[data-testid="logo-placeholder"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('app-image-carousel')).toBeNull();
  });

  it('emits moveToTopRequested when the move-to-top button is clicked', () => {
    const fixture = createFixture(makeOrganization({ slug: 'group' }));
    const moveToTopRequested = vi.fn();
    fixture.componentInstance.moveToTopRequested.subscribe(moveToTopRequested);

    (fixture.nativeElement.querySelector('[data-testid="move-to-top-button"]') as HTMLButtonElement).click();

    expect(moveToTopRequested).toHaveBeenCalled();
  });

  it('emits moveUpRequested when the move-up button is clicked', () => {
    const fixture = createFixture(makeOrganization({ slug: 'group' }));
    const moveUpRequested = vi.fn();
    fixture.componentInstance.moveUpRequested.subscribe(moveUpRequested);

    (fixture.nativeElement.querySelector('[data-testid="move-up-button"]') as HTMLButtonElement).click();

    expect(moveUpRequested).toHaveBeenCalled();
  });

  it('emits moveDownRequested when the move-down button is clicked', () => {
    const fixture = createFixture(makeOrganization({ slug: 'group' }));
    const moveDownRequested = vi.fn();
    fixture.componentInstance.moveDownRequested.subscribe(moveDownRequested);

    (fixture.nativeElement.querySelector('[data-testid="move-down-button"]') as HTMLButtonElement).click();

    expect(moveDownRequested).toHaveBeenCalled();
  });

  it('disables the top/up buttons when isFirst is true', () => {
    const fixture = createFixture(makeOrganization({ slug: 'group' }), { isFirst: true });

    expect(
      (fixture.nativeElement.querySelector('[data-testid="move-to-top-button"]') as HTMLButtonElement).disabled,
    ).toBe(true);
    expect(
      (fixture.nativeElement.querySelector('[data-testid="move-up-button"]') as HTMLButtonElement).disabled,
    ).toBe(true);
    expect(
      (fixture.nativeElement.querySelector('[data-testid="move-down-button"]') as HTMLButtonElement).disabled,
    ).toBe(false);
  });

  it('disables the down button when isLast is true', () => {
    const fixture = createFixture(makeOrganization({ slug: 'group' }), { isLast: true });

    expect(
      (fixture.nativeElement.querySelector('[data-testid="move-down-button"]') as HTMLButtonElement).disabled,
    ).toBe(true);
  });

  it('disables all move buttons when reorderingDisabled is true', () => {
    const fixture = createFixture(makeOrganization({ slug: 'group' }), { reorderingDisabled: true });

    expect(
      (fixture.nativeElement.querySelector('[data-testid="move-to-top-button"]') as HTMLButtonElement).disabled,
    ).toBe(true);
    expect(
      (fixture.nativeElement.querySelector('[data-testid="move-up-button"]') as HTMLButtonElement).disabled,
    ).toBe(true);
    expect(
      (fixture.nativeElement.querySelector('[data-testid="move-down-button"]') as HTMLButtonElement).disabled,
    ).toBe(true);
  });
});

import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { CdkDragDrop, CdkDropList } from '@angular/cdk/drag-drop';
import { MatSnackBar } from '@angular/material/snack-bar';
import { OrganizationsListPage } from './organizations-list.page';
import { OrganizationService } from '../../services/organization.service';
import { Organization, OrganizationType } from '../../models/organization.model';
import { TranslationSuggestionService } from '../../../../shared/services/translation-suggestion.service';
import { LanguageService } from '../../../../core/i18n/language.service';
import { FakeOrganizationService, makeOrganization } from '../../testing/fake-organization-service';

describe('OrganizationsListPage', () => {
  let service: FakeOrganizationService;
  let language: LanguageService;

  beforeEach(() => {
    service = new FakeOrganizationService();
    TestBed.configureTestingModule({
      providers: [
        { provide: OrganizationService, useValue: service },
        { provide: TranslationSuggestionService, useValue: { suggest: vi.fn(() => new Promise(() => {})) } },
        { provide: MatSnackBar, useValue: { open: vi.fn() } },
      ],
    });
    language = TestBed.inject(LanguageService);
  });

  function createFixture() {
    const fixture = TestBed.createComponent(OrganizationsListPage);
    fixture.detectChanges();
    return fixture;
  }

  function orgFixture(type: OrganizationType, slug: string, order: number): Organization {
    return makeOrganization({
      type,
      slug,
      order,
      translations: { en: { name: slug, description: '' } },
    });
  }

  it('shows an empty state when there are no organizations', () => {
    const fixture = createFixture();

    expect(fixture.nativeElement.querySelector('[data-testid="empty-state"]')).not.toBeNull();
  });

  it('lists organizations sorted by order', () => {
    service.seed([orgFixture('local-group', 'first', 0), orgFixture('ngo', 'second', 1)]);
    const fixture = createFixture();

    const names = Array.from(
      fixture.nativeElement.querySelectorAll('[data-testid="organization-name"]'),
    ).map((el) => (el as HTMLElement).textContent?.trim());
    expect(names).toEqual(['first', 'second']);
  });

  it('filters to a single type when a filter option is selected', () => {
    service.seed([orgFixture('local-group', 'a-local-group', 0), orgFixture('ngo', 'an-ngo', 1)]);
    const fixture = createFixture();

    fixture.componentInstance['activeFilter'].set('ngo');
    fixture.detectChanges();

    const names = Array.from(
      fixture.nativeElement.querySelectorAll('[data-testid="organization-name"]'),
    ).map((el) => (el as HTMLElement).textContent?.trim());
    expect(names).toEqual(['an-ngo']);
  });

  it('opens the drawer in create mode with no locked type when "+ Agregar" is clicked', () => {
    const fixture = createFixture();

    (fixture.nativeElement.querySelector('[data-testid="add-button"]') as HTMLButtonElement).click();
    fixture.detectChanges();

    const drawer = fixture.nativeElement.querySelector('app-organization-form-drawer');
    expect(drawer).not.toBeNull();
    expect(fixture.componentInstance['drawerContext']()).toEqual({ mode: 'create' });
  });

  it('closes the drawer when the form emits saved', () => {
    const fixture = createFixture();
    (fixture.nativeElement.querySelector('[data-testid="add-button"]') as HTMLButtonElement).click();
    fixture.detectChanges();

    fixture.componentInstance['onSaved']();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('app-organization-form-drawer')).toBeNull();
  });

  it('binds the rendered drop list data to the currently visible organizations', () => {
    service.seed([orgFixture('local-group', 'a', 0), orgFixture('ngo', 'b', 1)]);
    const fixture = createFixture();

    const dropList = fixture.debugElement.query(By.directive(CdkDropList)).injector.get(CdkDropList);

    expect(dropList.data).toEqual(service.organizations());
  });

  it('reorders organizations through the service when a drop occurs while unfiltered', async () => {
    const a = orgFixture('local-group', 'a', 0);
    const b = orgFixture('ngo', 'b', 1);
    const c = orgFixture('social-network', 'c', 2);
    service.seed([a, b, c]);
    const fixture = createFixture();
    const component = fixture.componentInstance;

    const orgs: Organization[] = service.organizations();
    component.onDrop({
      previousIndex: 0,
      currentIndex: 2,
      container: { data: orgs },
    } as CdkDragDrop<Organization[]>);
    await Promise.resolve();
    await Promise.resolve();

    expect(service.organizations().map((o) => o.slug)).toEqual([b.slug, c.slug, a.slug]);
  });

  it('disables the drop list when a specific type filter is active', () => {
    service.seed([orgFixture('local-group', 'a', 0), orgFixture('ngo', 'b', 1)]);
    const fixture = createFixture();

    fixture.componentInstance['activeFilter'].set('ngo');
    fixture.detectChanges();

    const dropList = fixture.debugElement.query(By.directive(CdkDropList)).injector.get(CdkDropList);
    expect(dropList.disabled).toBe(true);
  });

  it('keeps the drop list enabled when the filter is "all"', () => {
    service.seed([orgFixture('local-group', 'a', 0)]);
    const fixture = createFixture();

    const dropList = fixture.debugElement.query(By.directive(CdkDropList)).injector.get(CdkDropList);
    expect(dropList.disabled).toBe(false);
  });

  it('shows the working-language indicator using the current UI language', () => {
    language.setLanguage('es');
    const fixture = createFixture();

    expect(fixture.nativeElement.querySelector('h1')?.textContent?.trim()).toBe(
      language.t().organizations.organizationsList.heading,
    );
  });
});

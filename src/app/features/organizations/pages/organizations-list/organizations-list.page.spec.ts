import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { CdkDragDrop, CdkDropList } from '@angular/cdk/drag-drop';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of } from 'rxjs';
import { OrganizationsListPage } from './organizations-list.page';
import { OrganizationService } from '../../services/organization.service';
import { Organization, OrganizationStatus, OrganizationType } from '../../models/organization.model';
import { TranslationSuggestionService } from '../../../../shared/services/translation-suggestion.service';
import { LanguageService } from '../../../../core/i18n/language.service';
import { FakeOrganizationService, makeOrganization } from '../../testing/fake-organization-service';

class FakeIntersectionObserver implements IntersectionObserver {
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
  ) {}
}

describe('OrganizationsListPage', () => {
  let service: FakeOrganizationService;
  let language: LanguageService;

  beforeEach(() => {
    global.IntersectionObserver = FakeIntersectionObserver as unknown as typeof IntersectionObserver;
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

  function orgFixture(
    type: OrganizationType,
    slug: string,
    order: number,
    status: OrganizationStatus = 'draft',
  ): Organization {
    return makeOrganization({
      type,
      slug,
      order,
      status,
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

  it('filters to a single status when a status filter option is selected', () => {
    service.seed([
      orgFixture('local-group', 'a-draft', 0, 'draft'),
      orgFixture('ngo', 'a-published', 1, 'published'),
    ]);
    const fixture = createFixture();

    fixture.componentInstance['statusFilter'].set('published');
    fixture.detectChanges();

    const names = Array.from(
      fixture.nativeElement.querySelectorAll('[data-testid="organization-name"]'),
    ).map((el) => (el as HTMLElement).textContent?.trim());
    expect(names).toEqual(['a-published']);
  });

  it('combines the type and status filters', () => {
    service.seed([
      orgFixture('ngo', 'ngo-draft', 0, 'draft'),
      orgFixture('ngo', 'ngo-published', 1, 'published'),
      orgFixture('local-group', 'group-published', 2, 'published'),
    ]);
    const fixture = createFixture();

    fixture.componentInstance['activeFilter'].set('ngo');
    fixture.componentInstance['statusFilter'].set('published');
    fixture.detectChanges();

    const names = Array.from(
      fixture.nativeElement.querySelectorAll('[data-testid="organization-name"]'),
    ).map((el) => (el as HTMLElement).textContent?.trim());
    expect(names).toEqual(['ngo-published']);
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

  it('disables the drop list when a specific status filter is active', () => {
    service.seed([orgFixture('local-group', 'a', 0, 'draft'), orgFixture('ngo', 'b', 1, 'published')]);
    const fixture = createFixture();

    fixture.componentInstance['statusFilter'].set('published');
    fixture.detectChanges();

    const dropList = fixture.debugElement.query(By.directive(CdkDropList)).injector.get(CdkDropList);
    expect(dropList.disabled).toBe(true);
  });

  it('keeps the drop list enabled when both filters are "all"', () => {
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

  describe('move-to-top / move-up / move-down', () => {
    it('moves a middle organization to the top through the service', async () => {
      const a = orgFixture('local-group', 'a', 0);
      const b = orgFixture('ngo', 'b', 1);
      const c = orgFixture('social-network', 'c', 2);
      service.seed([a, b, c]);
      const fixture = createFixture();

      fixture.componentInstance['onMoveToTop'](b.id);
      await Promise.resolve();
      await Promise.resolve();

      expect(service.reorder).toHaveBeenCalledWith([b.id, a.id, c.id]);
    });

    it('moves a middle organization up through the service', async () => {
      const a = orgFixture('local-group', 'a', 0);
      const b = orgFixture('ngo', 'b', 1);
      const c = orgFixture('social-network', 'c', 2);
      service.seed([a, b, c]);
      const fixture = createFixture();

      fixture.componentInstance['onMoveUp'](c.id);
      await Promise.resolve();
      await Promise.resolve();

      expect(service.reorder).toHaveBeenCalledWith([a.id, c.id, b.id]);
    });

    it('moves a middle organization down through the service', async () => {
      const a = orgFixture('local-group', 'a', 0);
      const b = orgFixture('ngo', 'b', 1);
      const c = orgFixture('social-network', 'c', 2);
      service.seed([a, b, c]);
      const fixture = createFixture();

      fixture.componentInstance['onMoveDown'](a.id);
      await Promise.resolve();
      await Promise.resolve();

      expect(service.reorder).toHaveBeenCalledWith([b.id, a.id, c.id]);
    });
  });

  describe('infinite scroll', () => {
    function seedMany(count: number): Organization[] {
      const orgs = Array.from({ length: count }, (_, i) =>
        orgFixture('ngo', `org-${i.toString().padStart(3, '0')}`, i),
      );
      service.seed(orgs);
      return orgs;
    }

    it('renders only the first page of organizations initially', () => {
      seedMany(30);
      const fixture = createFixture();

      const cards = fixture.nativeElement.querySelectorAll('[data-testid="organization-name"]');
      expect(cards.length).toBe(24);
    });

    it('renders more organizations when onNearEnd is triggered', () => {
      seedMany(30);
      const fixture = createFixture();

      fixture.componentInstance['onNearEnd']();
      fixture.detectChanges();

      const cards = fixture.nativeElement.querySelectorAll('[data-testid="organization-name"]');
      expect(cards.length).toBe(30);
    });

    it('does not request more once every organization is visible', () => {
      seedMany(10);
      const fixture = createFixture();

      expect(fixture.componentInstance['hasMore']()).toBe(false);
    });

    it('does not reset the visible window when the underlying data changes without a filter change', async () => {
      const orgs = seedMany(30);
      const fixture = createFixture();

      fixture.componentInstance['onNearEnd']();
      fixture.detectChanges();
      expect(fixture.componentInstance['visibleCount']()).toBe(48);

      fixture.componentInstance['onMoveToTop'](orgs[5].id);
      await Promise.resolve();
      await Promise.resolve();
      fixture.detectChanges();

      expect(fixture.componentInstance['visibleCount']()).toBe(48);
    });

    it('resets the visible window when the type filter changes', () => {
      seedMany(30);
      const fixture = createFixture();

      fixture.componentInstance['onNearEnd']();
      fixture.detectChanges();
      expect(fixture.componentInstance['visibleCount']()).toBe(48);

      fixture.componentInstance['activeFilter'].set('ngo');
      fixture.detectChanges();

      expect(fixture.componentInstance['visibleCount']()).toBe(24);
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

  describe('bulk selection', () => {
    it('deletes the selected organizations via the service after confirming', async () => {
      const a = orgFixture('local-group', 'a', 0);
      service.seed([a]);
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
      const a = orgFixture('local-group', 'a', 0);
      service.seed([a]);
      const fixture = createFixture();
      const dialog = TestBed.inject(MatDialog);
      vi.spyOn(dialog, 'open').mockReturnValue({ afterClosed: () => of(false) } as ReturnType<MatDialog['open']>);

      fixture.componentInstance['toggleSelection'](a.id);
      fixture.componentInstance['requestBulkDelete']();

      expect(service.delete).not.toHaveBeenCalled();
    });
  });
});

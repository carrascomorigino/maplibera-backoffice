import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { CdkDragDrop, CdkDropList } from '@angular/cdk/drag-drop';
import { SectionsListPage } from './sections-list.page';
import { SectionService } from '../../services/section.service';
import { Section } from '../../models/section.model';

describe('SectionsListPage', () => {
  let service: SectionService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    service = TestBed.inject(SectionService);
  });

  function createFixture() {
    const fixture = TestBed.createComponent(SectionsListPage);
    fixture.detectChanges();
    return fixture;
  }

  it('renders sections from the service sorted by order', () => {
    service.create({ title: 'First', description: '', imageUrl: '' });
    const second = service.create({ title: 'Second', description: '', imageUrl: '' });
    const first = service.sections()[0];
    service.reorder([second.id, first.id]);

    const fixture = createFixture();

    const titles = Array.from(fixture.nativeElement.querySelectorAll('[data-testid="section-title"]')).map(
      (el) => (el as HTMLElement).textContent?.trim(),
    );
    expect(titles).toEqual(['Second', 'First']);
  });

  it('shows an empty state when there are no sections', () => {
    const fixture = createFixture();

    expect(fixture.nativeElement.textContent).toContain('No sections yet');
  });

  it('shows a Publish button for draft sections and publishes on click', () => {
    const section = service.create({ title: 'Draft one', description: '', imageUrl: '' });
    const fixture = createFixture();

    const button = fixture.nativeElement.querySelector(
      `[data-testid="status-action-${section.id}"]`,
    ) as HTMLButtonElement;
    expect(button.textContent?.trim()).toBe('Publish');

    button.click();
    fixture.detectChanges();

    expect(service.sections()[0].status).toBe('published');
  });

  it('shows a Pause button for published sections and pauses on click', () => {
    const section = service.create({ title: 'Live one', description: '', imageUrl: '' });
    service.publish(section.id);
    const fixture = createFixture();

    const button = fixture.nativeElement.querySelector(
      `[data-testid="status-action-${section.id}"]`,
    ) as HTMLButtonElement;
    expect(button.textContent?.trim()).toBe('Pause');

    button.click();
    fixture.detectChanges();

    expect(service.sections()[0].status).toBe('paused');
  });

  it('shows a Publish button again for paused sections', () => {
    const section = service.create({ title: 'Paused one', description: '', imageUrl: '' });
    service.publish(section.id);
    service.pause(section.id);
    const fixture = createFixture();

    const button = fixture.nativeElement.querySelector(
      `[data-testid="status-action-${section.id}"]`,
    ) as HTMLButtonElement;
    expect(button.textContent?.trim()).toBe('Publish');
  });

  it('binds the rendered drop list data to the current sections so real drops carry data', () => {
    service.create({ title: 'A', description: '', imageUrl: '' });
    service.create({ title: 'B', description: '', imageUrl: '' });
    const fixture = createFixture();

    const dropList = fixture.debugElement.query(By.directive(CdkDropList))
      .injector.get(CdkDropList);

    expect(dropList.data).toEqual(service.sections());
  });

  it('reorders sections through the service when a drop occurs', () => {
    const a = service.create({ title: 'A', description: '', imageUrl: '' });
    const b = service.create({ title: 'B', description: '', imageUrl: '' });
    const c = service.create({ title: 'C', description: '', imageUrl: '' });
    const fixture = createFixture();
    const component = fixture.componentInstance;

    const sections: Section[] = service.sections();
    component.onDrop({
      previousIndex: 0,
      currentIndex: 2,
      container: { data: sections },
    } as CdkDragDrop<Section[]>);

    expect(service.sections().map((s) => s.id)).toEqual([b.id, c.id, a.id]);
  });

  it('opens the drawer in create mode when "New section" is clicked', () => {
    const fixture = createFixture();

    const newButton = fixture.nativeElement.querySelector(
      '[data-testid="new-section-button"]',
    ) as HTMLButtonElement;
    newButton.click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('app-section-form-drawer')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('[data-testid="save-button"]')).not.toBeNull();
  });

  it('opens the drawer in edit mode with the selected section when Edit is clicked', () => {
    service.create({ title: 'Editable', description: 'desc', imageUrl: '' });
    const fixture = createFixture();

    const editButton = fixture.nativeElement.querySelector(
      '[data-testid="edit-button"]',
    ) as HTMLButtonElement;
    editButton.click();
    fixture.detectChanges();

    const titleInput = fixture.nativeElement.querySelector('input[formcontrolname="title"]') as HTMLInputElement;
    expect(titleInput.value).toBe('Editable');
  });

  it('closes the drawer when the form emits closed', () => {
    const fixture = createFixture();
    fixture.nativeElement.querySelector('[data-testid="new-section-button"]').click();
    fixture.detectChanges();

    (fixture.nativeElement.querySelector('[data-testid="cancel-button"]') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('app-section-form-drawer')).toBeNull();
  });
});

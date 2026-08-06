import { TestBed } from '@angular/core/testing';
import { SectionFormDrawer } from './section-form-drawer';
import { SectionService } from '../../services/section.service';

describe('SectionFormDrawer', () => {
  let service: SectionService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    service = TestBed.inject(SectionService);
  });

  function createFixture() {
    const fixture = TestBed.createComponent(SectionFormDrawer);
    fixture.detectChanges();
    return fixture;
  }

  function buttons(fixture: ReturnType<typeof createFixture>) {
    return {
      save: fixture.nativeElement.querySelector('[data-testid="save-button"]') as HTMLButtonElement,
      publish: fixture.nativeElement.querySelector(
        '[data-testid="publish-button"]',
      ) as HTMLButtonElement,
      cancel: fixture.nativeElement.querySelector(
        '[data-testid="cancel-button"]',
      ) as HTMLButtonElement,
    };
  }

  it('disables Save and Publish until title and description are filled', () => {
    const fixture = createFixture();
    const component = fixture.componentInstance;

    let { save, publish } = buttons(fixture);
    expect(save.disabled).toBe(true);
    expect(publish.disabled).toBe(true);

    component.form.controls.title.setValue('A title');
    fixture.detectChanges();
    ({ save, publish } = buttons(fixture));
    expect(save.disabled).toBe(true);

    component.form.controls.description.setValue('A description');
    fixture.detectChanges();
    ({ save, publish } = buttons(fixture));
    expect(save.disabled).toBe(false);
    expect(publish.disabled).toBe(false);
  });

  it('creates a draft section on Save for a new section', () => {
    const fixture = createFixture();
    const component = fixture.componentInstance;
    let closed = false;
    component.closed.subscribe(() => (closed = true));

    component.form.controls.title.setValue('New section');
    component.form.controls.description.setValue('Description');
    fixture.detectChanges();
    buttons(fixture).save.click();

    expect(service.sections()).toHaveLength(1);
    expect(service.sections()[0].status).toBe('draft');
    expect(service.sections()[0].title).toBe('New section');
    expect(closed).toBe(true);
  });

  it('creates and publishes a section on Publish for a new section', () => {
    const fixture = createFixture();
    const component = fixture.componentInstance;

    component.form.controls.title.setValue('New section');
    component.form.controls.description.setValue('Description');
    fixture.detectChanges();
    buttons(fixture).publish.click();

    expect(service.sections()).toHaveLength(1);
    expect(service.sections()[0].status).toBe('published');
  });

  it('updates an existing section on Save without changing its status', () => {
    const existing = service.create({ title: 'Original', description: 'Original desc', imageUrl: '' });
    service.publish(existing.id);
    const fixture = TestBed.createComponent(SectionFormDrawer);
    fixture.componentRef.setInput('section', service.sections()[0]);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    component.form.controls.title.setValue('Updated title');
    fixture.detectChanges();
    buttons(fixture).save.click();

    const updated = service.sections()[0];
    expect(updated.title).toBe('Updated title');
    expect(updated.status).toBe('published');
  });

  it('does not call the service on Cancel', () => {
    const fixture = createFixture();
    const component = fixture.componentInstance;
    let closed = false;
    component.closed.subscribe(() => (closed = true));

    component.form.controls.title.setValue('Should not be saved');
    component.form.controls.description.setValue('Should not be saved');
    fixture.detectChanges();
    buttons(fixture).cancel.click();

    expect(service.sections()).toHaveLength(0);
    expect(closed).toBe(true);
  });

  it('blocks submission and hides the preview for an invalid image URL, shows it for a valid one', () => {
    const fixture = createFixture();
    const component = fixture.componentInstance;

    component.form.controls.title.setValue('A title');
    component.form.controls.description.setValue('A description');
    component.form.controls.imageUrl.setValue('not-a-url');
    fixture.detectChanges();

    expect(buttons(fixture).save.disabled).toBe(true);
    expect(fixture.nativeElement.querySelector('[data-testid="image-preview"]')).toBeNull();

    component.form.controls.imageUrl.setValue('https://example.com/image.png');
    fixture.detectChanges();

    expect(buttons(fixture).save.disabled).toBe(false);
    const preview = fixture.nativeElement.querySelector(
      '[data-testid="image-preview"]',
    ) as HTMLImageElement;
    expect(preview).not.toBeNull();
    expect(preview.src).toBe('https://example.com/image.png');
  });
});

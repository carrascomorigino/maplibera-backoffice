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
      ) as HTMLButtonElement | null,
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
    expect(publish?.disabled).toBe(true);

    component.form.controls.title.setValue('A title');
    fixture.detectChanges();
    ({ save, publish } = buttons(fixture));
    expect(save.disabled).toBe(true);

    component.form.controls.description.setValue('A description');
    fixture.detectChanges();
    ({ save, publish } = buttons(fixture));
    expect(save.disabled).toBe(false);
    expect(publish?.disabled).toBe(false);
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
    buttons(fixture).publish?.click();

    expect(service.sections()).toHaveLength(1);
    expect(service.sections()[0].status).toBe('published');
  });

  it('updates an existing section on Save without changing its status', () => {
    const existing = service.create({
      slug: 'original',
      title: 'Original',
      description: 'Original desc',
      imageUrl: '',
    });
    service.publish(existing.slug);
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

  it('hides the Publish button when editing an existing section', () => {
    const existing = service.create({
      slug: 'original',
      title: 'Original',
      description: 'Original desc',
      imageUrl: '',
    });
    const fixture = TestBed.createComponent(SectionFormDrawer);
    fixture.componentRef.setInput('section', existing);
    fixture.detectChanges();

    expect(buttons(fixture).publish).toBeNull();
  });

  it('shows the Publish button when creating a new section', () => {
    const fixture = createFixture();

    expect(buttons(fixture).publish).not.toBeNull();
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

  describe('slug', () => {
    it('auto-suggests a slug from the title until the user edits the slug directly', () => {
      const fixture = createFixture();
      const component = fixture.componentInstance;

      component.form.controls.title.setValue('Getting Started');
      fixture.detectChanges();
      expect(component.form.controls.slug.value).toBe('getting-started');

      component.form.controls.title.setValue('Getting Started Fast');
      fixture.detectChanges();
      expect(component.form.controls.slug.value).toBe('getting-started-fast');

      component.form.controls.slug.setValue('custom-slug');
      fixture.detectChanges();

      component.form.controls.title.setValue('A Totally Different Title');
      fixture.detectChanges();
      expect(component.form.controls.slug.value).toBe('custom-slug');
    });

    it('blocks submission with a duplicate slug', () => {
      service.create({
        slug: 'existing-section',
        title: 'Existing Section',
        description: 'Existing desc',
        imageUrl: '',
      });
      const fixture = createFixture();
      const component = fixture.componentInstance;

      component.form.controls.title.setValue('A title');
      component.form.controls.description.setValue('A description');
      component.form.controls.slug.setValue('existing-section');
      component.form.controls.slug.markAsTouched();
      fixture.detectChanges();

      expect(component.form.controls.slug.hasError('duplicateSlug')).toBe(true);
      expect(buttons(fixture).save.disabled).toBe(true);
      expect(
        fixture.nativeElement.querySelector('mat-error')?.textContent?.trim(),
      ).toBe('A section with this slug already exists');

      component.form.controls.slug.setValue('a-unique-slug');
      fixture.detectChanges();

      expect(component.form.controls.slug.hasError('duplicateSlug')).toBe(false);
      expect(buttons(fixture).save.disabled).toBe(false);
    });

    it('allows keeping the same slug when editing the section that already owns it', () => {
      const existing = service.create({
        slug: 'original-slug',
        title: 'Original',
        description: 'Original desc',
        imageUrl: '',
      });
      const fixture = TestBed.createComponent(SectionFormDrawer);
      fixture.componentRef.setInput('section', existing);
      fixture.detectChanges();
      const component = fixture.componentInstance;

      component.form.controls.slug.setValue('original-slug');
      fixture.detectChanges();

      expect(component.form.controls.slug.hasError('duplicateSlug')).toBe(false);
      expect(buttons(fixture).save.disabled).toBe(false);
    });

    it('rejects slugs that are not lowercase kebab-case', () => {
      const fixture = createFixture();
      const component = fixture.componentInstance;

      component.form.controls.title.setValue('A title');
      component.form.controls.description.setValue('A description');
      component.form.controls.slug.setValue('Not A Slug!');
      fixture.detectChanges();

      expect(component.form.controls.slug.hasError('pattern')).toBe(true);
      expect(buttons(fixture).save.disabled).toBe(true);

      component.form.controls.slug.setValue('a-valid-slug');
      fixture.detectChanges();

      expect(component.form.controls.slug.hasError('pattern')).toBe(false);
      expect(buttons(fixture).save.disabled).toBe(false);
    });

    it('allows duplicate titles across different sections', () => {
      service.create({
        slug: 'first-section',
        title: 'Same Title',
        description: 'A',
        imageUrl: '',
      });
      const fixture = createFixture();
      const component = fixture.componentInstance;

      component.form.controls.title.setValue('Same Title');
      component.form.controls.description.setValue('B');
      component.form.controls.slug.setValue('second-section');
      fixture.detectChanges();

      expect(component.form.controls.title.valid).toBe(true);
      expect(buttons(fixture).save.disabled).toBe(false);
    });

    it('persists the slug on save and keys updates by the section slug', () => {
      const fixture = createFixture();
      const component = fixture.componentInstance;

      component.form.controls.title.setValue('New section');
      component.form.controls.description.setValue('Description');
      component.form.controls.slug.setValue('new-section');
      fixture.detectChanges();
      buttons(fixture).save.click();

      expect(service.sections()[0].slug).toBe('new-section');
    });
  });
});

import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { CdkDragDrop, CdkDropList } from '@angular/cdk/drag-drop';
import { SectionsListPage } from './sections-list.page';
import { SectionService } from '../../services/section.service';
import { Question, Section } from '../../models/section.model';

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

  it('shows "Guide" as the page heading', () => {
    const fixture = createFixture();

    expect(fixture.nativeElement.querySelector('h1')?.textContent?.trim()).toBe('Guide');
  });

  it('renders sections from the service sorted by order', () => {
    service.create({ slug: 'first', title: 'First', description: '', imageUrl: '' });
    const second = service.create({ slug: 'second', title: 'Second', description: '', imageUrl: '' });
    const first = service.sections()[0];
    service.reorder([second.slug, first.slug]);

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

  it('shows the slug for each section', () => {
    service.create({ slug: 'getting-started', title: 'Getting started', description: '', imageUrl: '' });
    const fixture = createFixture();

    const slug = fixture.nativeElement.querySelector('[data-testid="section-slug"]') as HTMLElement;
    expect(slug.textContent?.trim()).toBe('getting-started');
  });

  it('shows a placeholder icon when a section has no image', () => {
    service.create({ slug: 'no-image', title: 'No image', description: '', imageUrl: '' });
    const fixture = createFixture();

    expect(fixture.nativeElement.querySelector('[data-testid="thumbnail-placeholder"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('img')).toBeNull();
  });

  it('shows the image and no placeholder when a section has an image', () => {
    service.create({
      slug: 'with-image',
      title: 'With image',
      description: '',
      imageUrl: 'https://example.com/image.png',
    });
    const fixture = createFixture();

    expect(fixture.nativeElement.querySelector('[data-testid="thumbnail-placeholder"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('img')).not.toBeNull();
  });

  it('shows a drag handle for each section', () => {
    service.create({ slug: 'a', title: 'A', description: '', imageUrl: '' });
    const fixture = createFixture();

    expect(fixture.nativeElement.querySelector('[data-testid="drag-handle"]')).not.toBeNull();
  });

  it('shows a Publish button for draft sections and publishes on click', () => {
    const section = service.create({ slug: 'draft-one', title: 'Draft one', description: '', imageUrl: '' });
    const fixture = createFixture();

    const button = fixture.nativeElement.querySelector(
      `[data-testid="status-action-${section.slug}"]`,
    ) as HTMLButtonElement;
    expect(button.textContent?.trim()).toBe('Publish');

    button.click();
    fixture.detectChanges();

    expect(service.sections()[0].status).toBe('published');
  });

  it('shows a Pause button for published sections and pauses on click', () => {
    const section = service.create({ slug: 'live-one', title: 'Live one', description: '', imageUrl: '' });
    service.publish(section.slug);
    const fixture = createFixture();

    const button = fixture.nativeElement.querySelector(
      `[data-testid="status-action-${section.slug}"]`,
    ) as HTMLButtonElement;
    expect(button.textContent?.trim()).toBe('Pause');

    button.click();
    fixture.detectChanges();

    expect(service.sections()[0].status).toBe('paused');
  });

  it('shows a Publish button again for paused sections', () => {
    const section = service.create({ slug: 'paused-one', title: 'Paused one', description: '', imageUrl: '' });
    service.publish(section.slug);
    service.pause(section.slug);
    const fixture = createFixture();

    const button = fixture.nativeElement.querySelector(
      `[data-testid="status-action-${section.slug}"]`,
    ) as HTMLButtonElement;
    expect(button.textContent?.trim()).toBe('Publish');
  });

  it('binds the rendered drop list data to the current sections so real drops carry data', () => {
    service.create({ slug: 'a', title: 'A', description: '', imageUrl: '' });
    service.create({ slug: 'b', title: 'B', description: '', imageUrl: '' });
    const fixture = createFixture();

    const dropList = fixture.debugElement.query(By.directive(CdkDropList))
      .injector.get(CdkDropList);

    expect(dropList.data).toEqual(service.sections());
  });

  it('reorders sections through the service when a drop occurs', () => {
    const a = service.create({ slug: 'a', title: 'A', description: '', imageUrl: '' });
    const b = service.create({ slug: 'b', title: 'B', description: '', imageUrl: '' });
    const c = service.create({ slug: 'c', title: 'C', description: '', imageUrl: '' });
    const fixture = createFixture();
    const component = fixture.componentInstance;

    const sections: Section[] = service.sections();
    component.onDrop({
      previousIndex: 0,
      currentIndex: 2,
      container: { data: sections },
    } as CdkDragDrop<Section[]>);

    expect(service.sections().map((s) => s.slug)).toEqual([b.slug, c.slug, a.slug]);
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
    service.create({ slug: 'editable', title: 'Editable', description: 'desc', imageUrl: '' });
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

  describe('question summary', () => {
    it('shows nothing extra when the section has no question', () => {
      service.create({ slug: 'no-question', title: 'No question', description: '', imageUrl: '' });
      const fixture = createFixture();

      expect(fixture.nativeElement.querySelector('[data-testid="question-type"]')).toBeNull();
    });

    it('shows the type, text, and only the correct answer for a yes/no question', () => {
      service.create({
        slug: 'yn',
        title: 'YN',
        description: '',
        imageUrl: '',
        question: { text: 'Is this correct?', type: 'yes-no', yesNoCorrectAnswer: 'yes' },
      });
      const fixture = createFixture();

      expect(
        fixture.nativeElement.querySelector('[data-testid="question-type"]')?.textContent?.trim(),
      ).toBe('Yes/No question');
      expect(
        fixture.nativeElement.querySelector('[data-testid="question-text"]')?.textContent?.trim(),
      ).toBe('Is this correct?');
      const answers = Array.from(
        fixture.nativeElement.querySelectorAll('[data-testid="correct-answer"]'),
      ).map((el) => (el as HTMLElement).textContent?.trim());
      expect(answers).toEqual(['Yes']);
    });

    it('shows only the correct answers for a multiple choice question, including specials', () => {
      service.create({
        slug: 'mc',
        title: 'MC',
        description: '',
        imageUrl: '',
        question: {
          text: 'Pick all that apply',
          type: 'multiple',
          answers: [
            { text: 'A', isCorrect: false },
            { text: 'B', isCorrect: false },
            { text: 'C', isCorrect: false },
          ],
          includeAllOfTheAbove: true,
          allOfTheAboveCorrect: true,
        },
      });
      const fixture = createFixture();

      const answers = Array.from(
        fixture.nativeElement.querySelectorAll('[data-testid="correct-answer"]'),
      ).map((el) => (el as HTMLElement).textContent?.trim());
      expect(answers).toEqual(['All of the above']);
    });
  });

  describe('correctAnswerLabels', () => {
    it('returns Yes or No for a yes/no question', () => {
      const fixture = createFixture();
      const component = fixture.componentInstance;

      expect(
        component.correctAnswerLabels({ text: 'Q', type: 'yes-no', yesNoCorrectAnswer: 'yes' }),
      ).toEqual(['Yes']);
      expect(
        component.correctAnswerLabels({ text: 'Q', type: 'yes-no', yesNoCorrectAnswer: 'no' }),
      ).toEqual(['No']);
    });

    it('returns the correct answer texts for single/multiple choice', () => {
      const fixture = createFixture();
      const component = fixture.componentInstance;
      const question: Question = {
        text: 'Q',
        type: 'multiple',
        answers: [
          { text: 'A', isCorrect: true },
          { text: 'B', isCorrect: false },
          { text: 'C', isCorrect: true },
        ],
      };

      expect(component.correctAnswerLabels(question)).toEqual(['A', 'C']);
    });

    it('includes "All of the above" / "None of the above" when marked correct', () => {
      const fixture = createFixture();
      const component = fixture.componentInstance;
      const question: Question = {
        text: 'Q',
        type: 'single',
        answers: [{ text: 'A', isCorrect: false }],
        includeNoneOfTheAbove: true,
        noneOfTheAboveCorrect: true,
      };

      expect(component.correctAnswerLabels(question)).toEqual(['None of the above']);
    });
  });
});

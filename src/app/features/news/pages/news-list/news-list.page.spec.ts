import { TestBed } from '@angular/core/testing';
import { NewsListPage } from './news-list.page';
import { NewsItemService } from '../../services/news-item.service';
import { TranslationSuggestionService } from '../../../../shared/services/translation-suggestion.service';
import { LanguageService } from '../../../../core/i18n/language.service';
import { NewsCategory } from '../../models/news-item.model';

describe('NewsListPage', () => {
  let service: NewsItemService;
  let language: LanguageService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        { provide: TranslationSuggestionService, useValue: { suggest: vi.fn(() => new Promise(() => {})) } },
      ],
    });
    service = TestBed.inject(NewsItemService);
    language = TestBed.inject(LanguageService);
  });

  function createFixture() {
    const fixture = TestBed.createComponent(NewsListPage);
    fixture.detectChanges();
    return fixture;
  }

  function createItem(category: NewsCategory, slug: string, publishedAt: string) {
    return service.create({
      category,
      slug,
      sharedFields: {
        imageUrl: '',
        publishedAt,
        eventDate: category === 'event' ? '2026-12-01' : undefined,
        sourceLinks: [],
      },
      language: 'en',
      translation: { title: slug, subtitle: '', description: '' },
    });
  }

  it('shows an empty state when there are no items', () => {
    const fixture = createFixture();

    expect(fixture.nativeElement.querySelector('[data-testid="empty-state"]')).not.toBeNull();
  });

  it('lists items sorted by publishedAt descending regardless of creation order', () => {
    createItem('news', 'oldest', '2026-01-01');
    createItem('event', 'newest', '2026-08-01');
    const fixture = createFixture();

    const titles = Array.from(
      fixture.nativeElement.querySelectorAll('[data-testid="news-title"]'),
    ).map((el) => (el as HTMLElement).textContent?.trim());
    expect(titles).toEqual(['newest', 'oldest']);
  });

  it('filters to a single category when a filter option is selected', () => {
    createItem('news', 'a-news-item', '2026-01-01');
    createItem('event', 'an-event', '2026-02-01');
    const fixture = createFixture();

    fixture.componentInstance['activeFilter'].set('event');
    fixture.detectChanges();

    const titles = Array.from(
      fixture.nativeElement.querySelectorAll('[data-testid="news-title"]'),
    ).map((el) => (el as HTMLElement).textContent?.trim());
    expect(titles).toEqual(['an-event']);
  });

  it('opens the drawer in create mode with no locked category when "+ Agregar" is clicked', () => {
    const fixture = createFixture();

    (fixture.nativeElement.querySelector('[data-testid="add-button"]') as HTMLButtonElement).click();
    fixture.detectChanges();

    const drawer = fixture.nativeElement.querySelector('app-news-form-drawer');
    expect(drawer).not.toBeNull();
    expect(fixture.componentInstance['drawerContext']()).toEqual({ mode: 'create' });
  });

  it('has no drag-and-drop affordances', () => {
    createItem('news', 'a-news-item', '2026-01-01');
    const fixture = createFixture();

    expect(fixture.nativeElement.querySelector('[cdkDropList]')).toBeNull();
    expect(fixture.nativeElement.querySelector('[data-testid="drag-handle"]')).toBeNull();
  });

  it('closes the drawer when the form emits saved', () => {
    const fixture = createFixture();
    (fixture.nativeElement.querySelector('[data-testid="add-button"]') as HTMLButtonElement).click();
    fixture.detectChanges();

    fixture.componentInstance['onSaved']();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('app-news-form-drawer')).toBeNull();
  });
});

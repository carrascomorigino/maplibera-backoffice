import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { of } from 'rxjs';
import { NewsCard } from './news-card';
import { NewsItemService } from '../../services/news-item.service';
import { LanguageService } from '../../../../core/i18n/language.service';
import { NewsItem } from '../../models/news-item.model';

describe('NewsCard', () => {
  let service: NewsItemService;
  let language: LanguageService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    service = TestBed.inject(NewsItemService);
    language = TestBed.inject(LanguageService);
  });

  function createFixture(item: NewsItem) {
    const fixture = TestBed.createComponent(NewsCard);
    fixture.componentRef.setInput('item', item);
    fixture.detectChanges();
    return fixture;
  }

  function newsItem(): NewsItem {
    return service.create({
      category: 'news',
      slug: 'new-visitor-center',
      sharedFields: {
        imageUrl: 'https://example.com/banner.jpg',
        publishedAt: '2026-08-01',
        sourceLinks: [],
      },
      language: 'en',
      translation: { title: 'New visitor center', subtitle: 'Now open', description: 'Details' },
    });
  }

  function eventItem(): NewsItem {
    return service.create({
      category: 'event',
      slug: 'summer-festival',
      sharedFields: {
        imageUrl: 'https://example.com/festival.jpg',
        publishedAt: '2026-07-01',
        eventDate: '2026-08-15',
        sourceLinks: [],
      },
      language: 'en',
      translation: { title: 'Summer festival', subtitle: 'Join us', description: 'Details' },
    });
  }

  it('shows the banner image', () => {
    const fixture = createFixture(newsItem());

    const img = fixture.nativeElement.querySelector('img') as HTMLImageElement;
    expect(img).not.toBeNull();
    expect(img.src).toBe('https://example.com/banner.jpg');
  });

  it('shows the status badge', () => {
    const fixture = createFixture(newsItem());

    expect(fixture.nativeElement.querySelector('[data-testid="status-badge"]')?.textContent?.trim()).toBe(
      'draft',
    );
  });

  it('shows the category badge for news', () => {
    const fixture = createFixture(newsItem());

    expect(fixture.nativeElement.querySelector('[data-testid="category-badge"]')?.textContent?.trim()).toBe(
      language.t().news.newsList.categoryBadgeNews,
    );
  });

  it('shows the category badge and event date for an event', () => {
    const fixture = createFixture(eventItem());

    expect(fixture.nativeElement.querySelector('[data-testid="category-badge"]')?.textContent?.trim()).toBe(
      language.t().news.newsList.categoryBadgeEvent,
    );
    expect(fixture.nativeElement.querySelector('[data-testid="event-date"]')).not.toBeNull();
  });

  it('does not show an event date for a news item', () => {
    const fixture = createFixture(newsItem());

    expect(fixture.nativeElement.querySelector('[data-testid="event-date"]')).toBeNull();
  });

  it('has no drag handle', () => {
    const fixture = createFixture(newsItem());

    expect(fixture.nativeElement.querySelector('[data-testid="drag-handle"]')).toBeNull();
  });

  it('toggles publish/pause via the service', () => {
    const item = newsItem();
    const fixture = createFixture(item);

    (fixture.nativeElement.querySelector(
      `[data-testid="status-action-${item.slug}"]`,
    ) as HTMLButtonElement).click();

    expect(service.items()[0].status).toBe('published');
  });

  it('emits editRequested when the edit button is clicked', () => {
    const item = newsItem();
    const fixture = createFixture(item);
    const editRequested = vi.fn();
    fixture.componentInstance.editRequested.subscribe(editRequested);

    (fixture.nativeElement.querySelector('[data-testid="edit-button"]') as HTMLButtonElement).click();

    expect(editRequested).toHaveBeenCalledWith({
      item,
      targetLanguage: 'en',
      staleSourceLanguage: undefined,
    });
  });

  it('removes a translation via the confirm dialog, same as resources', () => {
    const created = newsItem();
    service.saveTranslation(created.slug, 'es', {
      title: 'Nuevo centro de visitantes',
      subtitle: 'Ya abrió',
      description: 'Detalles',
    });
    const item = service.items()[0];
    const fixture = createFixture(item);
    const dialog = TestBed.inject(MatDialog);
    vi.spyOn(dialog, 'open').mockReturnValue({ afterClosed: () => of(true) } as ReturnType<MatDialog['open']>);

    fixture.componentInstance['onLanguageRemoved']('es');

    expect(service.items()[0].translations.es).toBeUndefined();
  });
});

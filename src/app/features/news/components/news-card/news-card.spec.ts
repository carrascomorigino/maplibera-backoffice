import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of } from 'rxjs';
import { NewsCard } from './news-card';
import { NewsItemService } from '../../services/news-item.service';
import { LanguageService } from '../../../../core/i18n/language.service';
import { NewsItem } from '../../models/news-item.model';
import { FakeNewsItemService, makeNewsItem } from '../../testing/fake-news-item-service';

describe('NewsCard', () => {
  let service: FakeNewsItemService;
  let language: LanguageService;
  let snackBarOpen: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    service = new FakeNewsItemService();
    snackBarOpen = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        { provide: NewsItemService, useValue: service },
        { provide: MatSnackBar, useValue: { open: snackBarOpen } },
      ],
    });
    language = TestBed.inject(LanguageService);
  });

  function createFixture(item: NewsItem) {
    const fixture = TestBed.createComponent(NewsCard);
    fixture.componentRef.setInput('item', item);
    fixture.detectChanges();
    return fixture;
  }

  function newsItem(): NewsItem {
    return makeNewsItem({
      category: 'news',
      slug: 'new-visitor-center',
      imageUrl: 'https://example.com/banner.jpg',
      publishedAt: '2026-08-01',
      translations: { en: { title: 'New visitor center', subtitle: 'Now open', description: 'Details' } },
    });
  }

  function eventItem(): NewsItem {
    return makeNewsItem({
      category: 'event',
      slug: 'summer-festival',
      imageUrl: 'https://example.com/festival.jpg',
      publishedAt: '2026-07-01',
      eventDate: '2026-08-15',
      translations: { en: { title: 'Summer festival', subtitle: 'Join us', description: 'Details' } },
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

  it('toggles publish/pause via the service', async () => {
    const item = newsItem();
    const fixture = createFixture(item);

    (fixture.nativeElement.querySelector(
      `[data-testid="status-action-${item.slug}"]`,
    ) as HTMLButtonElement).click();
    await Promise.resolve();

    expect(service.publish).toHaveBeenCalledWith(item.id);
  });

  it('shows an error notice when the status action fails', async () => {
    service.publish.mockRejectedValueOnce(new Error('network error'));
    const item = newsItem();
    const fixture = createFixture(item);

    (fixture.nativeElement.querySelector(
      `[data-testid="status-action-${item.slug}"]`,
    ) as HTMLButtonElement).click();
    await Promise.resolve();
    await Promise.resolve();

    expect(snackBarOpen).toHaveBeenCalled();
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

  it('removes a translation via the confirm dialog, same as resources', async () => {
    const item = newsItem();
    const fixture = createFixture(item);
    const dialog = TestBed.inject(MatDialog);
    vi.spyOn(dialog, 'open').mockReturnValue({ afterClosed: () => of(true) } as ReturnType<MatDialog['open']>);

    fixture.componentInstance['onLanguageRemoved']('es');
    await Promise.resolve();

    expect(service.removeTranslation).toHaveBeenCalledWith(item.id, 'es');
  });

  it('emits selectionToggled when the checkbox is toggled', () => {
    const item = newsItem();
    const fixture = createFixture(item);
    const selectionToggled = vi.fn();
    fixture.componentInstance.selectionToggled.subscribe(selectionToggled);

    (
      fixture.nativeElement.querySelector('[data-testid="select-checkbox"] input') as HTMLInputElement
    ).click();

    expect(selectionToggled).toHaveBeenCalled();
  });
});

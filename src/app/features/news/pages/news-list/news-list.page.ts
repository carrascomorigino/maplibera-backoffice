import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatDrawer, MatDrawerContainer, MatDrawerContent } from '@angular/material/sidenav';
import { NEWS_CATEGORIES, NewsCategory, NewsItem } from '../../models/news-item.model';
import { ContentLanguage } from '../../../guide/models/content-language.model';
import { NewsItemService } from '../../services/news-item.service';
import { NewsFormDrawer } from '../../components/news-form-drawer/news-form-drawer';
import { NewsCard, NewsEditRequestedEvent, NewsTranslateRequestedEvent } from '../../components/news-card/news-card';
import { LanguageService } from '../../../../core/i18n/language.service';

type DrawerContext =
  | { mode: 'create' }
  | {
      mode: 'edit';
      item: NewsItem;
      targetLanguage: ContentLanguage;
      staleSourceLanguage?: ContentLanguage;
    }
  | { mode: 'translate'; item: NewsItem; targetLanguage: ContentLanguage; sourceLanguage: ContentLanguage };

@Component({
  selector: 'app-news-list',
  imports: [
    MatButtonModule,
    MatButtonToggleModule,
    MatDrawerContainer,
    MatDrawer,
    MatDrawerContent,
    NewsFormDrawer,
    NewsCard,
  ],
  templateUrl: './news-list.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NewsListPage {
  private readonly newsItemService = inject(NewsItemService);
  protected readonly language = inject(LanguageService);

  protected readonly categories = NEWS_CATEGORIES;
  protected readonly activeFilter = signal<NewsCategory | 'all'>('all');
  protected readonly visibleItems = computed<readonly NewsItem[]>(() => {
    const filter = this.activeFilter();
    const items = this.newsItemService.items();
    return filter === 'all' ? items : items.filter((item) => item.category === filter);
  });

  protected readonly drawerContext = signal<DrawerContext | undefined>(undefined);
  protected readonly isDrawerOpen = computed(() => this.drawerContext() !== undefined);

  protected readonly drawerItem = computed<NewsItem | undefined>(() => {
    const ctx = this.drawerContext();
    return ctx && ctx.mode !== 'create' ? ctx.item : undefined;
  });

  protected readonly drawerTargetLanguage = computed<ContentLanguage>(() => {
    const ctx = this.drawerContext();
    if (!ctx || ctx.mode === 'create') {
      return this.language.language();
    }
    return ctx.targetLanguage;
  });

  protected readonly drawerSourceLanguage = computed<ContentLanguage | undefined>(() => {
    const ctx = this.drawerContext();
    return ctx?.mode === 'translate' ? ctx.sourceLanguage : undefined;
  });

  protected readonly drawerStaleSourceLanguage = computed<ContentLanguage | undefined>(() => {
    const ctx = this.drawerContext();
    return ctx?.mode === 'edit' ? ctx.staleSourceLanguage : undefined;
  });

  protected openCreate(): void {
    this.drawerContext.set({ mode: 'create' });
  }

  protected openEdit(event: NewsEditRequestedEvent): void {
    this.drawerContext.set({
      mode: 'edit',
      item: event.item,
      targetLanguage: event.targetLanguage,
      staleSourceLanguage: event.staleSourceLanguage,
    });
  }

  protected openTranslate(event: NewsTranslateRequestedEvent): void {
    this.drawerContext.set({
      mode: 'translate',
      item: event.item,
      targetLanguage: event.targetLanguage,
      sourceLanguage: event.sourceLanguage,
    });
  }

  protected onSaved(): void {
    this.drawerContext.set(undefined);
  }

  protected onCancelled(): void {
    this.drawerContext.set(undefined);
  }

  protected filterLabel(category: NewsCategory): string {
    const labels = this.language.t().news.newsList;
    return category === 'event' ? labels.filterEventLabel : labels.filterNewsLabel;
  }
}

import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { NewsItem, NewsStatus } from '../../models/news-item.model';
import {
  ContentLanguage,
  CONTENT_LANGUAGES,
  CONTENT_LANGUAGE_LABELS,
} from '../../../guide/models/content-language.model';
import { NewsItemService } from '../../services/news-item.service';
import { LanguageService } from '../../../../core/i18n/language.service';
import { LanguageTags } from '../../../../shared/components/language-tags/language-tags';
import { ConfirmDialog } from '../../../../shared/components/confirm-dialog/confirm-dialog';

export interface NewsEditRequestedEvent {
  item: NewsItem;
  targetLanguage: ContentLanguage;
  staleSourceLanguage?: ContentLanguage;
}

export interface NewsTranslateRequestedEvent {
  item: NewsItem;
  sourceLanguage: ContentLanguage;
  targetLanguage: ContentLanguage;
}

@Component({
  selector: 'app-news-card',
  imports: [MatButtonModule, LanguageTags],
  templateUrl: './news-card.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'flex flex-col gap-2 rounded border border-gray-200 p-3',
  },
})
export class NewsCard {
  private readonly newsItemService = inject(NewsItemService);
  private readonly dialog = inject(MatDialog);
  protected readonly language = inject(LanguageService);
  protected readonly contentLanguages = CONTENT_LANGUAGES;
  protected readonly contentLanguageLabels = CONTENT_LANGUAGE_LABELS;

  readonly item = input.required<NewsItem>();

  readonly editRequested = output<NewsEditRequestedEvent>();
  readonly translateRequested = output<NewsTranslateRequestedEvent>();

  private readonly _selectedLanguage = signal<ContentLanguage | undefined>(undefined);

  readonly selectedLanguage = computed<ContentLanguage>(
    () => this._selectedLanguage() ?? this.initialLanguageFor(this.item()),
  );

  readonly translation = computed(() => this.item().translations[this.selectedLanguage()]);

  readonly availableLanguages = computed(
    () => this.contentLanguages.filter((lang) => this.item().translations[lang]) as ContentLanguage[],
  );

  protected onLanguageSelected(newLanguage: ContentLanguage): void {
    this._selectedLanguage.set(newLanguage);

    const staleSourceLanguage = this.item().staleLanguages?.[newLanguage];
    if (staleSourceLanguage) {
      this.editRequested.emit({
        item: this.item(),
        targetLanguage: newLanguage,
        staleSourceLanguage,
      });
    }
  }

  protected onTranslateRequested(newLanguage: ContentLanguage): void {
    const previous = this.selectedLanguage();
    this._selectedLanguage.set(newLanguage);
    this.translateRequested.emit({
      item: this.item(),
      sourceLanguage: previous,
      targetLanguage: newLanguage,
    });
  }

  protected onLanguageRemoved(lang: ContentLanguage): void {
    const labels = this.language.t().languageTags;
    const dialogRef = this.dialog.open(ConfirmDialog, {
      data: {
        title: labels.removeConfirmTitle,
        message: labels.removeConfirmMessage(this.contentLanguageLabels[lang]),
        confirmLabel: labels.removeConfirmConfirmButton,
        cancelLabel: labels.removeConfirmCancelButton,
      },
    });
    dialogRef.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        this.newsItemService.removeTranslation(this.item().slug, lang);
      }
    });
  }

  protected onEdit(): void {
    const targetLanguage = this.selectedLanguage();
    this.editRequested.emit({
      item: this.item(),
      targetLanguage,
      staleSourceLanguage: this.item().staleLanguages?.[targetLanguage],
    });
  }

  protected statusActionLabel(status: NewsStatus): string {
    const labels = this.language.t().news.newsList;
    return status === 'published' ? labels.pauseAction : labels.publishAction;
  }

  protected onStatusAction(): void {
    const item = this.item();
    if (item.status === 'published') {
      this.newsItemService.pause(item.slug);
    } else {
      this.newsItemService.publish(item.slug);
    }
  }

  protected statusBadgeClass(status: NewsStatus): string {
    switch (status) {
      case 'published':
        return 'bg-green-100 text-green-800';
      case 'paused':
        return 'bg-amber-100 text-amber-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  private initialLanguageFor(item: NewsItem): ContentLanguage {
    const uiLanguage = this.language.language();
    if (item.translations[uiLanguage]) {
      return uiLanguage;
    }
    const [first] = this.contentLanguages.filter((lang) => item.translations[lang]);
    return first ?? uiLanguage;
  }
}

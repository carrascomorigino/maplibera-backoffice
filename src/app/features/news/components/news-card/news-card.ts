import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
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
    class:
      'flex flex-col gap-2 rounded-xl border border-ink-100 bg-surface-card p-3 shadow-[0_1px_2px_-1px_rgba(23,21,31,0.06),0_1px_3px_rgba(23,21,31,0.04)] transition-shadow hover:shadow-[0_2px_4px_-1px_rgba(23,21,31,0.08),0_4px_8px_rgba(23,21,31,0.05)]',
  },
})
export class NewsCard {
  private readonly newsItemService = inject(NewsItemService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
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
        this.newsItemService.removeTranslation(this.item().id, lang).catch(() => this.notifyActionFailed());
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
    const action = item.status === 'published' ? this.newsItemService.pause(item.id) : this.newsItemService.publish(item.id);
    action.catch(() => this.notifyActionFailed());
  }

  private notifyActionFailed(): void {
    const form = this.language.t().news.newsForm;
    this.snackBar.open(form.actionFailedNotice, form.actionFailedDismiss);
  }

  protected statusBadgeClass(status: NewsStatus): string {
    switch (status) {
      case 'published':
        return 'bg-emerald-50 text-emerald-700';
      case 'paused':
        return 'bg-gold-100 text-gold-800';
      default:
        return 'bg-ink-100 text-ink-600';
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

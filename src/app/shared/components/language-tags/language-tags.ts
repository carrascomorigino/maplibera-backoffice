import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import {
  ContentLanguage,
  CONTENT_LANGUAGE_LABELS,
} from '../../../features/guide/models/content-language.model';
import { LanguageService } from '../../../core/i18n/language.service';

@Component({
  selector: 'app-language-tags',
  templateUrl: './language-tags.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LanguageTags {
  protected readonly language = inject(LanguageService);
  protected readonly contentLanguageLabels = CONTENT_LANGUAGE_LABELS;

  readonly languages = input.required<readonly ContentLanguage[]>();
  readonly translatedLanguages = input.required<readonly ContentLanguage[]>();
  readonly staleLanguages = input<Partial<Record<ContentLanguage, ContentLanguage>>>({});
  readonly selectedLanguage = input.required<ContentLanguage>();

  readonly languageSelected = output<ContentLanguage>();
  readonly translateRequested = output<ContentLanguage>();
  readonly languageRemoved = output<ContentLanguage>();

  protected isTranslated(lang: ContentLanguage): boolean {
    return this.translatedLanguages().includes(lang);
  }

  protected isStale(lang: ContentLanguage): boolean {
    return this.staleLanguages()[lang] !== undefined;
  }

  protected canRemove(lang: ContentLanguage): boolean {
    return this.isTranslated(lang) && this.translatedLanguages().length > 1;
  }

  protected tagClass(lang: ContentLanguage): string {
    const base = 'flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium transition-colors';
    const selected = lang === this.selectedLanguage() ? ' ring-2 ring-brand-500 ring-offset-1' : '';
    if (!this.isTranslated(lang)) {
      return `${base} bg-ink-100 text-ink-500${selected}`;
    }
    return `${base} bg-brand-50 text-brand-700${selected}`;
  }

  protected onTagClick(lang: ContentLanguage): void {
    if (this.isTranslated(lang)) {
      this.languageSelected.emit(lang);
    } else {
      this.translateRequested.emit(lang);
    }
  }

  protected onRemoveClick(event: Event, lang: ContentLanguage): void {
    event.stopPropagation();
    this.languageRemoved.emit(lang);
  }
}

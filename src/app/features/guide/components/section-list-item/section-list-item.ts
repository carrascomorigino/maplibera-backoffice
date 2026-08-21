import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { CdkDragHandle } from '@angular/cdk/drag-drop';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Question, QuestionType, Section, SectionStatus } from '../../models/section.model';
import { ContentLanguage, CONTENT_LANGUAGES, CONTENT_LANGUAGE_LABELS } from '../../models/content-language.model';
import { SectionService } from '../../services/section.service';
import { LanguageService } from '../../../../core/i18n/language.service';
import { LanguageTags } from '../../../../shared/components/language-tags/language-tags';
import { ConfirmDialog } from '../../../../shared/components/confirm-dialog/confirm-dialog';
import { countryDisplayName } from '../../../../shared/models/country.model';

export interface EditRequestedEvent {
  section: Section;
  targetLanguage: ContentLanguage;
  staleSourceLanguage?: ContentLanguage;
}

export interface TranslateRequestedEvent {
  section: Section;
  sourceLanguage: ContentLanguage;
  targetLanguage: ContentLanguage;
}

export interface ResetSelectionRequest {
  slug: string;
  language: ContentLanguage;
}

@Component({
  selector: 'app-section-list-item',
  imports: [CdkDragHandle, MatButtonModule, MatCheckboxModule, MatIconModule, LanguageTags],
  templateUrl: './section-list-item.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'flex flex-1 min-w-0 items-center gap-4',
  },
})
export class SectionListItem {
  private readonly sectionService = inject(SectionService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  protected readonly language = inject(LanguageService);

  protected readonly contentLanguages = CONTENT_LANGUAGES;
  protected readonly contentLanguageLabels = CONTENT_LANGUAGE_LABELS;

  readonly section = input.required<Section>();
  readonly resetRequest = input<ResetSelectionRequest | undefined>(undefined);
  readonly selected = input<boolean>(false);

  readonly editRequested = output<EditRequestedEvent>();
  readonly translateRequested = output<TranslateRequestedEvent>();
  readonly selectionToggled = output<void>();

  private readonly _selectedLanguage = signal<ContentLanguage | undefined>(undefined);

  readonly selectedLanguage = computed<ContentLanguage>(
    () => this._selectedLanguage() ?? this.initialLanguageFor(this.section()),
  );

  readonly translation = computed(() => this.section().translations[this.selectedLanguage()]);

  readonly availableLanguages = computed(
    () => this.contentLanguages.filter((lang) => this.section().translations[lang]) as ContentLanguage[],
  );

  constructor() {
    effect(() => {
      const request = this.resetRequest();
      if (request && request.slug === this.section().slug) {
        this._selectedLanguage.set(request.language);
      }
    });
  }

  protected onLanguageSelected(newLanguage: ContentLanguage): void {
    this._selectedLanguage.set(newLanguage);

    const staleSourceLanguage = this.section().staleLanguages?.[newLanguage];
    if (staleSourceLanguage) {
      this.editRequested.emit({
        section: this.section(),
        targetLanguage: newLanguage,
        staleSourceLanguage,
      });
    }
  }

  protected onTranslateRequested(newLanguage: ContentLanguage): void {
    const previous = this.selectedLanguage();
    this._selectedLanguage.set(newLanguage);
    this.translateRequested.emit({
      section: this.section(),
      sourceLanguage: previous,
      targetLanguage: newLanguage,
    });
  }

  protected onLanguageRemoved(lang: ContentLanguage): void {
    const labels = this.language.t().languageTags;
    const languageName = this.contentLanguageLabels[lang];
    const dialogRef = this.dialog.open(ConfirmDialog, {
      data: {
        title: labels.removeConfirmTitle,
        message: labels.removeConfirmMessage(languageName),
        confirmLabel: labels.removeConfirmConfirmButton,
        cancelLabel: labels.removeConfirmCancelButton,
      },
    });
    dialogRef.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        this.sectionService.removeTranslation(this.section().id, lang).catch(() => this.notifyActionFailed());
      }
    });
  }

  protected onEdit(): void {
    const targetLanguage = this.selectedLanguage();
    this.editRequested.emit({
      section: this.section(),
      targetLanguage,
      staleSourceLanguage: this.section().staleLanguages?.[targetLanguage],
    });
  }

  protected statusActionLabel(status: SectionStatus): string {
    const labels = this.language.t().guide.sectionsList;
    return status === 'published' ? labels.pauseAction : labels.publishAction;
  }

  protected onStatusAction(): void {
    const section = this.section();
    const action = section.status === 'published' ? this.sectionService.pause(section.id) : this.sectionService.publish(section.id);
    action.catch(() => this.notifyActionFailed());
  }

  private notifyActionFailed(): void {
    const labels = this.language.t().guide.sectionForm;
    this.snackBar.open(labels.actionFailedNotice, labels.actionFailedDismiss);
  }

  protected statusBadgeClass(status: SectionStatus): string {
    switch (status) {
      case 'published':
        return 'bg-emerald-50 text-emerald-700';
      case 'paused':
        return 'bg-gold-100 text-gold-800';
      default:
        return 'bg-ink-100 text-ink-600';
    }
  }

  protected questionTypeLabel(type: QuestionType): string {
    const labels = this.language.t().guide.sectionsList;
    switch (type) {
      case 'yes-no':
        return labels.questionTypeYesNo;
      case 'single':
        return labels.questionTypeSingle;
      case 'multiple':
        return labels.questionTypeMultiple;
    }
  }

  protected countryAvailabilityIndicator(): string {
    const codes = this.section().availableCountries;
    const labels = this.language.t().guide.sectionsList;
    if (!codes?.length) {
      return labels.countryAvailabilityIndicator(labels.countryAvailabilityWorldwide);
    }
    const uiLanguage = this.language.language();
    const names = codes.map((code) => countryDisplayName(code, uiLanguage)).join(', ');
    return labels.countryAvailabilityIndicator(names);
  }

  protected correctAnswerLabels(question: Question): string[] {
    const labels = this.language.t().guide.sectionsList;
    if (question.type === 'yes-no') {
      return [question.yesNoCorrectAnswer === 'no' ? labels.noLabel : labels.yesLabel];
    }

    const answerLabels = (question.answers ?? [])
      .filter((answer) => answer.isCorrect)
      .map((answer) => answer.text);
    if (question.allOfTheAboveCorrect) {
      answerLabels.push(labels.allOfTheAbove);
    }
    if (question.noneOfTheAboveCorrect) {
      answerLabels.push(labels.noneOfTheAbove);
    }
    return answerLabels;
  }

  private initialLanguageFor(section: Section): ContentLanguage {
    const uiLanguage = this.language.language();
    if (section.translations[uiLanguage]) {
      return uiLanguage;
    }
    const [first] = this.contentLanguages.filter((lang) => section.translations[lang]);
    return first ?? uiLanguage;
  }
}

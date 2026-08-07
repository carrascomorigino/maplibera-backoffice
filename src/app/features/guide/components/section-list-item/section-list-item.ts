import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { CdkDragHandle } from '@angular/cdk/drag-drop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Question, QuestionType, Section, SectionStatus } from '../../models/section.model';
import { ContentLanguage, CONTENT_LANGUAGES, CONTENT_LANGUAGE_LABELS } from '../../models/content-language.model';
import { SectionService } from '../../services/section.service';
import { LanguageService } from '../../../../core/i18n/language.service';

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
  imports: [CdkDragHandle, MatButtonModule, MatIconModule],
  templateUrl: './section-list-item.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'flex flex-1 min-w-0 items-center gap-4',
  },
})
export class SectionListItem {
  private readonly sectionService = inject(SectionService);
  protected readonly language = inject(LanguageService);

  protected readonly contentLanguages = CONTENT_LANGUAGES;
  protected readonly contentLanguageLabels = CONTENT_LANGUAGE_LABELS;

  readonly section = input.required<Section>();
  readonly resetRequest = input<ResetSelectionRequest | undefined>(undefined);

  readonly editRequested = output<EditRequestedEvent>();
  readonly translateRequested = output<TranslateRequestedEvent>();

  private readonly _selectedLanguage = signal<ContentLanguage | undefined>(undefined);

  readonly selectedLanguage = computed<ContentLanguage>(
    () => this._selectedLanguage() ?? this.initialLanguageFor(this.section()),
  );

  readonly translation = computed(() => this.section().translations[this.selectedLanguage()]);

  readonly availableLanguages = computed(
    () => this.contentLanguages.filter((lang) => this.section().translations[lang]) as ContentLanguage[],
  );

  readonly hasStaleLanguages = computed(
    () => Object.keys(this.section().staleLanguages ?? {}).length > 0,
  );

  constructor() {
    effect(() => {
      const request = this.resetRequest();
      if (request && request.slug === this.section().slug) {
        this._selectedLanguage.set(request.language);
      }
    });
  }

  protected onLanguageChange(newLanguage: ContentLanguage): void {
    const previous = this.selectedLanguage();
    this._selectedLanguage.set(newLanguage);

    if (!this.section().translations[newLanguage]) {
      this.translateRequested.emit({
        section: this.section(),
        sourceLanguage: previous,
        targetLanguage: newLanguage,
      });
      return;
    }

    const staleSourceLanguage = this.section().staleLanguages?.[newLanguage];
    if (staleSourceLanguage) {
      this.editRequested.emit({
        section: this.section(),
        targetLanguage: newLanguage,
        staleSourceLanguage,
      });
    }
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
    if (section.status === 'published') {
      this.sectionService.pause(section.slug);
    } else {
      this.sectionService.publish(section.slug);
    }
  }

  protected statusBadgeClass(status: SectionStatus): string {
    switch (status) {
      case 'published':
        return 'bg-green-100 text-green-800';
      case 'paused':
        return 'bg-amber-100 text-amber-800';
      default:
        return 'bg-gray-100 text-gray-800';
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

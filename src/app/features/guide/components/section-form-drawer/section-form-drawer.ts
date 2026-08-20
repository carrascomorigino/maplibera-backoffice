import { ChangeDetectionStrategy, Component, effect, inject, input, output, signal } from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Question, Section, SectionTranslation } from '../../models/section.model';
import { ContentLanguage, CONTENT_LANGUAGE_LABELS } from '../../models/content-language.model';
import { SectionService } from '../../services/section.service';
import { TranslationSuggestionService } from '../../../../shared/services/translation-suggestion.service';
import { StaleTranslationSuggestionCache } from '../../../../shared/services/stale-translation-suggestion-cache.service';
import { MarkdownEditor } from '../../../../shared/components/markdown-editor/markdown-editor';
import { QuestionEditor, QuestionDraft } from '../question-editor/question-editor';
import { CountrySelect } from '../country-select/country-select';
import { ImageInput } from '../../../../shared/components/image-input/image-input';
import { ImageValue } from '../../../../shared/models/image-value.model';
import { resolveImagePayload } from '../../../../shared/utils/image-payload';
import { slugify } from '../../../../shared/utils/slugify';
import { SLUG_PATTERN } from '../../../../shared/utils/patterns';
import { DESCRIPTION_MAX_LENGTH, TITLE_MAX_LENGTH } from '../../utils/field-limits';
import { LanguageService } from '../../../../core/i18n/language.service';

type CountryScope = 'all' | 'specific';

@Component({
  selector: 'app-section-form-drawer',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MarkdownEditor,
    QuestionEditor,
    CountrySelect,
    ImageInput,
  ],
  templateUrl: './section-form-drawer.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SectionFormDrawer {
  private readonly sectionService = inject(SectionService);
  private readonly translationSuggestionService = inject(TranslationSuggestionService);
  private readonly staleSuggestionCache = inject(StaleTranslationSuggestionCache);
  private readonly snackBar = inject(MatSnackBar);
  protected readonly language = inject(LanguageService);
  protected readonly contentLanguageLabels = CONTENT_LANGUAGE_LABELS;
  protected readonly titleMaxLength = TITLE_MAX_LENGTH;
  protected readonly descriptionMaxLength = DESCRIPTION_MAX_LENGTH;

  readonly section = input<Section | undefined>(undefined);
  readonly targetLanguage = input.required<ContentLanguage>();
  readonly sourceLanguage = input<ContentLanguage | undefined>(undefined);
  readonly staleSourceLanguage = input<ContentLanguage | undefined>(undefined);

  readonly saved = output<void>();
  readonly cancelled = output<void>();

  readonly loading = signal(false);
  readonly staleSuggestion = signal<SectionTranslation | undefined>(undefined);
  readonly staleSuggestionLoading = signal(false);
  readonly previewRevealed = signal(false);

  private readonly slugManuallyEdited = signal(false);
  private suggestionRequested = false;
  private staleSuggestionRequested = false;

  private readonly duplicateSlugValidator: ValidatorFn = (control) => {
    const slug = (control.value as string).trim().toLowerCase();
    if (!slug) {
      return null;
    }
    const currentSlug = this.section()?.slug;
    const isDuplicate = this.sectionService
      .sections()
      .some((section) => section.slug !== currentSlug && section.slug.toLowerCase() === slug);
    return isDuplicate ? { duplicateSlug: true } : null;
  };

  private readonly countriesRequiredValidator: ValidatorFn = (control) => {
    const scope = control.parent?.get('countryScope')?.value as CountryScope | undefined;
    const countries = control.value as string[];
    return scope === 'specific' && countries.length === 0 ? { countriesRequired: true } : null;
  };

  readonly form = new FormGroup({
    title: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(TITLE_MAX_LENGTH)],
    }),
    slug: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(SLUG_PATTERN), this.duplicateSlugValidator],
    }),
    description: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(DESCRIPTION_MAX_LENGTH)],
    }),
    imageUrl: new FormControl<ImageValue | undefined>(undefined, { nonNullable: true }),
    question: new FormControl<QuestionDraft | undefined>(undefined),
    countryScope: new FormControl<CountryScope>('all', { nonNullable: true }),
    countries: new FormControl<string[]>([], {
      nonNullable: true,
      validators: this.countriesRequiredValidator,
    }),
  });

  constructor() {
    this.form.controls.countryScope.valueChanges.subscribe(() => {
      this.form.controls.countries.updateValueAndValidity();
    });

    this.form.controls.title.valueChanges.subscribe((title) => {
      if (!this.slugManuallyEdited()) {
        this.form.controls.slug.setValue(slugify(title), { emitEvent: false });
      }
    });
    this.form.controls.slug.valueChanges.subscribe(() => {
      this.slugManuallyEdited.set(true);
    });

    effect(() => {
      const section = this.section();
      const targetLanguage = this.targetLanguage();
      const sourceLanguage = this.sourceLanguage();
      const staleSource = this.staleSourceLanguage();
      const existing = section?.translations[targetLanguage];

      this.slugManuallyEdited.set(false);
      this.staleSuggestion.set(undefined);
      this.staleSuggestionLoading.set(false);
      this.previewRevealed.set(false);
      this.form.reset(
        {
          title: existing?.title ?? '',
          slug: section?.slug ?? '',
          description: existing?.description ?? '',
          imageUrl: section?.imageUrl ? { kind: 'url', url: section.imageUrl } : undefined,
          question: this.toQuestionDraft(existing?.question),
          countryScope: section?.availableCountries?.length ? 'specific' : 'all',
          countries: section?.availableCountries ?? [],
        },
        { emitEvent: false },
      );

      if (!existing && section && sourceLanguage && !this.suggestionRequested) {
        const sourceTranslation = section.translations[sourceLanguage];
        if (sourceTranslation) {
          this.suggestionRequested = true;
          this.requestSuggestion(targetLanguage, sourceLanguage, sourceTranslation);
        }
      }

      if (existing && section && staleSource && !this.staleSuggestionRequested) {
        const sourceTranslation = section.translations[staleSource];
        if (sourceTranslation) {
          this.staleSuggestionRequested = true;
          this.loadStaleSuggestion(section.slug, targetLanguage, staleSource, sourceTranslation);
        }
      }
    });
  }

  protected previewStaleSuggestion(): void {
    this.previewRevealed.set(true);
  }

  protected titleSuggestionDiffers(): boolean {
    const suggestion = this.staleSuggestion();
    return !!suggestion && suggestion.title !== this.form.controls.title.value;
  }

  protected descriptionSuggestionDiffers(): boolean {
    const suggestion = this.staleSuggestion();
    return !!suggestion && suggestion.description !== this.form.controls.description.value;
  }

  protected questionSuggestionDiffers(): boolean {
    const suggestedQuestion = this.staleSuggestion()?.question;
    if (!suggestedQuestion) {
      return false;
    }
    // Comparing the AI suggestion's Question (plain string answer image URLs) against the
    // form's QuestionDraft (ImageValue answer images) via JSON.stringify never matches once
    // images are involved — acceptable, low-priority cosmetic limitation (see plan notes).
    return (
      JSON.stringify(suggestedQuestion) !== JSON.stringify(this.form.controls.question.value ?? undefined)
    );
  }

  /** Wraps a persisted Question's plain string answer image URLs as ImageValue for the form. */
  private toQuestionDraft(question: Question | undefined): QuestionDraft | undefined {
    if (!question) {
      return undefined;
    }
    if (!question.answers) {
      return question as QuestionDraft;
    }
    return {
      ...question,
      answers: question.answers.map((answer) => {
        const { imageUrl, ...rest } = answer;
        return { ...rest, ...(imageUrl ? { imageUrl: { kind: 'url', url: imageUrl } as ImageValue } : {}) };
      }),
    };
  }

  private loadStaleSuggestion(
    slug: string,
    targetLanguage: ContentLanguage,
    sourceLanguage: ContentLanguage,
    sourceTranslation: SectionTranslation,
  ): void {
    const cached = this.staleSuggestionCache.get<SectionTranslation, SectionTranslation>(
      slug,
      targetLanguage,
      sourceTranslation,
    );
    if (cached) {
      this.staleSuggestion.set(cached);
      return;
    }

    this.staleSuggestionLoading.set(true);
    this.translationSuggestionService
      .suggest(
        {
          language: sourceLanguage,
          fields: {
            title: sourceTranslation.title,
            description: sourceTranslation.description,
            question: sourceTranslation.question,
          },
        },
        targetLanguage,
      )
      .then((result) => {
        const translation = result as unknown as SectionTranslation;
        this.staleSuggestionCache.set(slug, targetLanguage, sourceTranslation, translation);
        this.staleSuggestion.set(translation);
      })
      .catch(() => {
        const sectionForm = this.language.t().guide.sectionForm;
        this.snackBar.open(sectionForm.suggestionFailedNotice, sectionForm.suggestionFailedDismiss);
      })
      .finally(() => {
        this.staleSuggestionLoading.set(false);
      });
  }

  protected acceptTitleSuggestion(): void {
    const suggestion = this.staleSuggestion();
    if (suggestion) {
      this.form.controls.title.setValue(suggestion.title, { emitEvent: false });
    }
  }

  protected acceptDescriptionSuggestion(): void {
    const suggestion = this.staleSuggestion();
    if (suggestion) {
      this.form.controls.description.setValue(suggestion.description, { emitEvent: false });
    }
  }

  protected acceptQuestionSuggestion(): void {
    const suggestion = this.staleSuggestion();
    if (suggestion) {
      this.form.controls.question.setValue(this.toQuestionDraft(suggestion.question), {
        emitEvent: false,
      });
    }
  }

  protected async save(): Promise<void> {
    try {
      await this.persist();
      this.saved.emit();
    } catch {
      this.notifyActionFailed();
    }
  }

  protected async publish(): Promise<void> {
    try {
      const section = await this.persist();
      await this.sectionService.publish(section.id);
      this.saved.emit();
    } catch {
      this.notifyActionFailed();
    }
  }

  private notifyActionFailed(): void {
    const sectionForm = this.language.t().guide.sectionForm;
    this.snackBar.open(sectionForm.actionFailedNotice, sectionForm.actionFailedDismiss);
  }

  protected cancel(): void {
    this.cancelled.emit();
  }

  private requestSuggestion(
    target: ContentLanguage,
    sourceLanguage: ContentLanguage,
    sourceTranslation: SectionTranslation,
  ): void {
    this.loading.set(true);
    this.translationSuggestionService
      .suggest(
        {
          language: sourceLanguage,
          fields: {
            title: sourceTranslation.title,
            description: sourceTranslation.description,
            question: sourceTranslation.question,
          },
        },
        target,
      )
      .then((response) => {
        if (this.targetLanguage() !== target) {
          return;
        }
        const result = response as unknown as SectionTranslation;
        this.form.patchValue(
          {
            title: result.title,
            description: result.description,
            question: this.toQuestionDraft(result.question),
          },
          { emitEvent: false },
        );
      })
      .catch(() => {
        if (this.targetLanguage() !== target) {
          return;
        }
        const sectionForm = this.language.t().guide.sectionForm;
        this.snackBar.open(sectionForm.suggestionFailedNotice, sectionForm.suggestionFailedDismiss);
        this.form.patchValue(
          {
            title: sourceTranslation.title,
            description: sourceTranslation.description,
            question: this.toQuestionDraft(sourceTranslation.question),
          },
          { emitEvent: false },
        );
      })
      .finally(() => {
        if (this.targetLanguage() === target) {
          this.loading.set(false);
        }
      });
  }

  private async persist(): Promise<Section> {
    const { title, slug, description, imageUrl, question, countryScope, countries } =
      this.form.getRawValue();
    const imagePayload = await resolveImagePayload(imageUrl);
    const questionValue = question ? await this.resolveQuestionDraft(question) : undefined;
    const existing = this.section();
    const translation: SectionTranslation = { title, description, question: questionValue };
    const availableCountries = countryScope === 'specific' ? countries : undefined;

    if (existing) {
      return this.sectionService.saveTranslation(existing.id, {
        slug,
        imageUrl: imagePayload?.url,
        imageData: imagePayload?.data,
        language: this.targetLanguage(),
        translation,
        availableCountries,
      });
    }

    return this.sectionService.create({
      slug,
      imageUrl: imagePayload?.url,
      imageData: imagePayload?.data,
      language: this.targetLanguage(),
      translation,
      availableCountries,
    });
  }

  private async resolveQuestionDraft(draft: QuestionDraft): Promise<Question> {
    if (!draft.answers) {
      return draft as Question;
    }
    const answers = await Promise.all(
      draft.answers.map(async (answer) => {
        const payload = await resolveImagePayload(answer.imageUrl);
        const { imageUrl: _imageUrl, ...rest } = answer;
        return { ...rest, imageUrl: payload?.url, imageData: payload?.data };
      }),
    );
    return { ...draft, answers } as Question;
  }
}

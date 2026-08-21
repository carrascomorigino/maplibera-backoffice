import { ChangeDetectionStrategy, Component, effect, inject, input, output, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, ValidatorFn, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar } from '@angular/material/snack-bar';
import { NewsCategory, NewsItem, NewsTranslation } from '../../models/news-item.model';
import { ContentLanguage, CONTENT_LANGUAGE_LABELS } from '../../../guide/models/content-language.model';
import { NewsItemService } from '../../services/news-item.service';
import { TranslationSuggestionService } from '../../../../shared/services/translation-suggestion.service';
import { StaleTranslationSuggestionCache } from '../../../../shared/services/stale-translation-suggestion-cache.service';
import { MarkdownEditor } from '../../../../shared/components/markdown-editor/markdown-editor';
import { StringListEditor } from '../../../../shared/components/string-list-editor/string-list-editor';
import { ImageGalleryInput } from '../../../../shared/components/image-gallery-input/image-gallery-input';
import { ImageValue } from '../../../../shared/models/image-value.model';
import { GalleryImageValue } from '../../../../shared/models/gallery-image-value.model';
import { resolveImagePayload } from '../../../../shared/utils/image-payload';
import { atLeastOneGalleryImage } from '../../../../shared/utils/gallery-validators';
import { slugify } from '../../../../shared/utils/slugify';
import { SLUG_PATTERN, URL_PATTERN } from '../../../../shared/utils/patterns';
import { GALLERY_IMAGE_DESCRIPTION_MAX_LENGTH } from '../../../../shared/utils/gallery-limits';
import { TITLE_MAX_LENGTH, SUBTITLE_MAX_LENGTH, DESCRIPTION_MAX_LENGTH } from '../../utils/field-limits';
import { LanguageService } from '../../../../core/i18n/language.service';

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

@Component({
  selector: 'app-news-form-drawer',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MarkdownEditor,
    StringListEditor,
    ImageGalleryInput,
  ],
  templateUrl: './news-form-drawer.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NewsFormDrawer {
  private readonly newsItemService = inject(NewsItemService);
  private readonly translationSuggestionService = inject(TranslationSuggestionService);
  private readonly staleSuggestionCache = inject(StaleTranslationSuggestionCache);
  private readonly snackBar = inject(MatSnackBar);
  protected readonly language = inject(LanguageService);
  protected readonly contentLanguageLabels = CONTENT_LANGUAGE_LABELS;
  protected readonly titleMaxLength = TITLE_MAX_LENGTH;
  protected readonly subtitleMaxLength = SUBTITLE_MAX_LENGTH;
  protected readonly descriptionMaxLength = DESCRIPTION_MAX_LENGTH;
  protected readonly galleryDescriptionMaxLength = GALLERY_IMAGE_DESCRIPTION_MAX_LENGTH;

  readonly item = input<NewsItem | undefined>(undefined);
  readonly targetLanguage = input.required<ContentLanguage>();
  readonly sourceLanguage = input<ContentLanguage | undefined>(undefined);
  readonly staleSourceLanguage = input<ContentLanguage | undefined>(undefined);

  readonly saved = output<void>();
  readonly cancelled = output<void>();

  readonly loading = signal(false);
  readonly staleSuggestion = signal<NewsTranslation | undefined>(undefined);
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
    const currentSlug = this.item()?.slug;
    const isDuplicate = this.newsItemService
      .items()
      .some((item) => item.slug !== currentSlug && item.slug.toLowerCase() === slug);
    return isDuplicate ? { duplicateSlug: true } : null;
  };

  private readonly eventDateRequiredValidator: ValidatorFn = (control) => {
    const category = control.parent?.get('category')?.value as NewsCategory | undefined;
    return category === 'event' && !control.value ? { eventDateRequired: true } : null;
  };

  readonly form = new FormGroup({
    category: new FormControl<NewsCategory>('news', { nonNullable: true }),
    title: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(TITLE_MAX_LENGTH)],
    }),
    slug: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(SLUG_PATTERN), this.duplicateSlugValidator],
    }),
    subtitle: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(SUBTITLE_MAX_LENGTH)],
    }),
    description: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(DESCRIPTION_MAX_LENGTH)],
    }),
    images: new FormControl<GalleryImageValue[]>([], {
      nonNullable: true,
      validators: atLeastOneGalleryImage,
    }),
    videoUrl: new FormControl('', {
      nonNullable: true,
      validators: Validators.pattern(URL_PATTERN),
    }),
    publishedAt: new FormControl('', { nonNullable: true, validators: Validators.required }),
    eventDate: new FormControl<string | null>(null, { validators: this.eventDateRequiredValidator }),
    sourceLinks: new FormControl<string[]>([], { nonNullable: true }),
  });

  constructor() {
    this.form.controls.category.valueChanges.subscribe((category) => {
      if (category !== 'event') {
        this.form.controls.eventDate.setValue(null, { emitEvent: false });
      }
      this.form.controls.eventDate.updateValueAndValidity();
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
      const item = this.item();
      const targetLanguage = this.targetLanguage();
      const sourceLanguage = this.sourceLanguage();
      const staleSource = this.staleSourceLanguage();
      const existing = item?.translations[targetLanguage];

      this.slugManuallyEdited.set(false);
      this.staleSuggestion.set(undefined);
      this.staleSuggestionLoading.set(false);
      this.previewRevealed.set(false);

      this.form.reset(
        {
          category: item?.category ?? 'news',
          title: existing?.title ?? '',
          slug: item?.slug ?? '',
          subtitle: existing?.subtitle ?? '',
          description: existing?.description ?? '',
          images: (item?.images ?? []).map((image) => ({
            image: { kind: 'url', url: image.url } as ImageValue,
            description: image.description,
          })),
          videoUrl: item?.videoUrl ?? '',
          publishedAt: item?.publishedAt ?? todayIso(),
          eventDate: item?.eventDate ?? null,
          sourceLinks: item?.sourceLinks ?? [],
        },
        { emitEvent: false },
      );

      if (item) {
        this.form.controls.category.disable({ emitEvent: false });
      } else {
        this.form.controls.category.enable({ emitEvent: false });
      }

      if (!existing && item && sourceLanguage && !this.suggestionRequested) {
        const sourceTranslation = item.translations[sourceLanguage];
        if (sourceTranslation) {
          this.suggestionRequested = true;
          this.requestSuggestion(targetLanguage, sourceLanguage, sourceTranslation);
        }
      }

      if (existing && item && staleSource && !this.staleSuggestionRequested) {
        const sourceTranslation = item.translations[staleSource];
        if (sourceTranslation) {
          this.staleSuggestionRequested = true;
          this.loadStaleSuggestion(item.slug, targetLanguage, staleSource, sourceTranslation);
        }
      }
    });
  }

  protected previewStaleSuggestion(): void {
    this.previewRevealed.set(true);
  }

  protected suggestionDiffers(): boolean {
    const suggestion = this.staleSuggestion();
    if (!suggestion) {
      return false;
    }
    return (
      suggestion.title !== this.form.controls.title.value ||
      suggestion.subtitle !== this.form.controls.subtitle.value ||
      suggestion.description !== this.form.controls.description.value
    );
  }

  protected acceptSuggestion(): void {
    const suggestion = this.staleSuggestion();
    if (!suggestion) {
      return;
    }
    this.form.patchValue(
      { title: suggestion.title, subtitle: suggestion.subtitle, description: suggestion.description },
      { emitEvent: false },
    );
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
      const item = await this.persist();
      await this.newsItemService.publish(item.id);
      this.saved.emit();
    } catch {
      this.notifyActionFailed();
    }
  }

  protected cancel(): void {
    this.cancelled.emit();
  }

  private notifyActionFailed(): void {
    const form = this.language.t().news.newsForm;
    this.snackBar.open(form.actionFailedNotice, form.actionFailedDismiss);
  }

  private requestSuggestion(
    target: ContentLanguage,
    sourceLanguage: ContentLanguage,
    sourceTranslation: NewsTranslation,
  ): void {
    this.loading.set(true);
    this.translationSuggestionService
      .suggest({ language: sourceLanguage, fields: { ...sourceTranslation } }, target)
      .then((result) => {
        if (this.targetLanguage() !== target) {
          return;
        }
        this.applySuggestionToForm(result as unknown as NewsTranslation);
      })
      .catch(() => {
        if (this.targetLanguage() !== target) {
          return;
        }
        const newsForm = this.language.t().news.newsForm;
        this.snackBar.open(newsForm.suggestionFailedNotice, newsForm.suggestionFailedDismiss);
        this.applySuggestionToForm(sourceTranslation);
      })
      .finally(() => {
        if (this.targetLanguage() === target) {
          this.loading.set(false);
        }
      });
  }

  private loadStaleSuggestion(
    slug: string,
    targetLanguage: ContentLanguage,
    sourceLanguage: ContentLanguage,
    sourceTranslation: NewsTranslation,
  ): void {
    const cached = this.staleSuggestionCache.get<NewsTranslation, NewsTranslation>(
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
      .suggest({ language: sourceLanguage, fields: { ...sourceTranslation } }, targetLanguage)
      .then((result) => {
        const translation = result as unknown as NewsTranslation;
        this.staleSuggestionCache.set(slug, targetLanguage, sourceTranslation, translation);
        this.staleSuggestion.set(translation);
      })
      .catch(() => {
        const newsForm = this.language.t().news.newsForm;
        this.snackBar.open(newsForm.suggestionFailedNotice, newsForm.suggestionFailedDismiss);
      })
      .finally(() => {
        this.staleSuggestionLoading.set(false);
      });
  }

  private applySuggestionToForm(result: NewsTranslation): void {
    this.form.patchValue(
      { title: result.title ?? '', subtitle: result.subtitle ?? '', description: result.description ?? '' },
      { emitEvent: false },
    );
  }

  private async persist(): Promise<NewsItem> {
    const {
      category,
      title,
      slug,
      subtitle,
      description,
      images,
      videoUrl,
      publishedAt,
      eventDate,
      sourceLinks,
    } = this.form.getRawValue();
    const translation: NewsTranslation = { title, subtitle, description };
    const imagesPayload = await Promise.all(
      images
        .filter((row): row is GalleryImageValue & { image: ImageValue } => row.image !== undefined)
        .map(async (row) => ({
          ...(await resolveImagePayload(row.image)),
          description: row.description,
        })),
    );
    const sharedFields = {
      images: imagesPayload,
      videoUrl,
      publishedAt,
      eventDate: eventDate ?? undefined,
      sourceLinks,
    };

    const existing = this.item();
    if (existing) {
      await this.newsItemService.updateSharedFields(existing.id, sharedFields);
      return this.newsItemService.saveTranslation(existing.id, this.targetLanguage(), translation, slug);
    }

    return this.newsItemService.create({
      category,
      slug,
      sharedFields,
      language: this.targetLanguage(),
      translation,
    });
  }
}

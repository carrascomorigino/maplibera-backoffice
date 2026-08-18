import { ChangeDetectionStrategy, Component, effect, inject, input, output, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, ValidatorFn, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Resource, ResourceCategory, ResourceTranslation } from '../../models/resource.model';
import { ContentLanguage, CONTENT_LANGUAGE_LABELS } from '../../../guide/models/content-language.model';
import { ResourceCreateInput, ResourceService } from '../../services/resource.service';
import { TranslationSuggestionService } from '../../../../shared/services/translation-suggestion.service';
import { StaleTranslationSuggestionCache } from '../../../../shared/services/stale-translation-suggestion-cache.service';
import { NutritionFieldsForm } from '../category-fields/nutrition-fields-form/nutrition-fields-form';
import { RecipeFieldsForm } from '../category-fields/recipe-fields-form/recipe-fields-form';
import { MultimediaFieldsForm } from '../category-fields/multimedia-fields-form/multimedia-fields-form';
import { AppFieldsForm } from '../category-fields/app-fields-form/app-fields-form';
import { slugify } from '../../../../shared/utils/slugify';
import { SLUG_PATTERN } from '../../../../shared/utils/patterns';
import { LanguageService } from '../../../../core/i18n/language.service';

const SHARED_FIELD_KEYS: Record<ResourceCategory, readonly string[]> = {
  nutrition: ['sourceLinks', 'pdfUrls'],
  recipes: ['preparationMinutes', 'photoUrls'],
  multimedia: ['mediaType', 'externalUrl', 'posterUrl'],
  apps: ['appStoreUrl', 'playStoreUrl', 'iconUrl'],
};

const TRANSLATED_FIELD_KEYS: Record<ResourceCategory, readonly string[]> = {
  nutrition: ['explanatoryText'],
  recipes: ['ingredients', 'steps'],
  multimedia: [],
  apps: [],
};

const DEFAULT_CATEGORY_FIELDS: Record<ResourceCategory, Record<string, unknown>> = {
  nutrition: { sourceLinks: [], pdfUrls: [], explanatoryText: '' },
  recipes: { preparationMinutes: 0, photoUrls: [], ingredients: [], steps: [] },
  multimedia: { mediaType: 'documentary', externalUrl: '', posterUrl: '' },
  apps: { appStoreUrl: '', playStoreUrl: '', iconUrl: '' },
};

@Component({
  selector: 'app-resource-form-drawer',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    NutritionFieldsForm,
    RecipeFieldsForm,
    MultimediaFieldsForm,
    AppFieldsForm,
  ],
  templateUrl: './resource-form-drawer.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResourceFormDrawer {
  private readonly resourceService = inject(ResourceService);
  private readonly translationSuggestionService = inject(TranslationSuggestionService);
  private readonly staleSuggestionCache = inject(StaleTranslationSuggestionCache);
  private readonly snackBar = inject(MatSnackBar);
  protected readonly language = inject(LanguageService);
  protected readonly contentLanguageLabels = CONTENT_LANGUAGE_LABELS;

  readonly resource = input<Resource | undefined>(undefined);
  readonly category = input.required<ResourceCategory>();
  readonly targetLanguage = input.required<ContentLanguage>();
  readonly sourceLanguage = input<ContentLanguage | undefined>(undefined);
  readonly staleSourceLanguage = input<ContentLanguage | undefined>(undefined);

  readonly saved = output<void>();
  readonly cancelled = output<void>();

  readonly loading = signal(false);
  readonly staleSuggestion = signal<Record<string, unknown> | undefined>(undefined);
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
    const currentSlug = this.resource()?.slug;
    const isDuplicate = this.resourceService
      .resources()
      .some((resource) => resource.slug !== currentSlug && resource.slug.toLowerCase() === slug);
    return isDuplicate ? { duplicateSlug: true } : null;
  };

  readonly form = new FormGroup({
    title: new FormControl('', { nonNullable: true, validators: Validators.required }),
    slug: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(SLUG_PATTERN), this.duplicateSlugValidator],
    }),
    shortDescription: new FormControl('', { nonNullable: true, validators: Validators.required }),
    categoryFields: new FormControl<Record<string, unknown>>({}, { nonNullable: true }),
  });

  constructor() {
    this.form.controls.title.valueChanges.subscribe((title) => {
      if (!this.slugManuallyEdited()) {
        this.form.controls.slug.setValue(slugify(title), { emitEvent: false });
      }
    });
    this.form.controls.slug.valueChanges.subscribe(() => {
      this.slugManuallyEdited.set(true);
    });

    effect(() => {
      const resource = this.resource();
      const category = this.category();
      const targetLanguage = this.targetLanguage();
      const sourceLanguage = this.sourceLanguage();
      const staleSource = this.staleSourceLanguage();
      const existing = resource?.translations[targetLanguage] as Record<string, unknown> | undefined;

      this.slugManuallyEdited.set(false);
      this.staleSuggestion.set(undefined);
      this.staleSuggestionLoading.set(false);
      this.previewRevealed.set(false);

      const sharedValues: Record<string, unknown> = {};
      if (resource) {
        for (const key of SHARED_FIELD_KEYS[category]) {
          sharedValues[key] = (resource as unknown as Record<string, unknown>)[key];
        }
      }
      const translatedValues: Record<string, unknown> = {};
      for (const key of TRANSLATED_FIELD_KEYS[category]) {
        if (existing && key in existing) {
          translatedValues[key] = existing[key];
        }
      }

      this.form.reset(
        {
          title: (existing?.['title'] as string) ?? '',
          slug: resource?.slug ?? '',
          shortDescription: (existing?.['shortDescription'] as string) ?? '',
          categoryFields: { ...DEFAULT_CATEGORY_FIELDS[category], ...sharedValues, ...translatedValues },
        },
        { emitEvent: false },
      );

      if (!existing && resource && sourceLanguage && !this.suggestionRequested) {
        const sourceTranslation = resource.translations[sourceLanguage] as
          | Record<string, unknown>
          | undefined;
        if (sourceTranslation) {
          this.suggestionRequested = true;
          this.requestSuggestion(category, targetLanguage, sourceLanguage, sourceTranslation);
        }
      }

      if (existing && resource && staleSource && !this.staleSuggestionRequested) {
        const sourceTranslation = resource.translations[staleSource] as
          | Record<string, unknown>
          | undefined;
        if (sourceTranslation) {
          this.staleSuggestionRequested = true;
          this.loadStaleSuggestion(resource.slug, category, targetLanguage, staleSource, sourceTranslation);
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
      suggestion['title'] !== this.form.controls.title.value ||
      suggestion['shortDescription'] !== this.form.controls.shortDescription.value
    );
  }

  protected acceptSuggestion(): void {
    const suggestion = this.staleSuggestion();
    if (!suggestion) {
      return;
    }
    this.form.controls.title.setValue((suggestion['title'] as string) ?? '', { emitEvent: false });
    this.form.controls.shortDescription.setValue((suggestion['shortDescription'] as string) ?? '', {
      emitEvent: false,
    });
    const translatedKeys = TRANSLATED_FIELD_KEYS[this.category()];
    if (translatedKeys.length > 0) {
      const current = this.form.controls.categoryFields.value;
      const patched = { ...current };
      for (const key of translatedKeys) {
        if (key in suggestion) {
          patched[key] = suggestion[key];
        }
      }
      this.form.controls.categoryFields.setValue(patched, { emitEvent: false });
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
      const resource = await this.persist();
      await this.resourceService.publish(resource.id);
      this.saved.emit();
    } catch {
      this.notifyActionFailed();
    }
  }

  protected cancel(): void {
    this.cancelled.emit();
  }

  private notifyActionFailed(): void {
    const form = this.language.t().resources.resourceForm;
    this.snackBar.open(form.actionFailedNotice, form.actionFailedDismiss);
  }

  private requestSuggestion(
    category: ResourceCategory,
    target: ContentLanguage,
    sourceLanguage: ContentLanguage,
    sourceTranslation: Record<string, unknown>,
  ): void {
    this.loading.set(true);
    this.translationSuggestionService
      .suggest({ language: sourceLanguage, fields: this.translatableFields(category, sourceTranslation) }, target)
      .then((result) => {
        if (this.targetLanguage() !== target) {
          return;
        }
        this.applySuggestionToForm(category, result);
      })
      .catch(() => {
        if (this.targetLanguage() !== target) {
          return;
        }
        const resourceForm = this.language.t().resources.resourceForm;
        this.snackBar.open(resourceForm.suggestionFailedNotice, resourceForm.suggestionFailedDismiss);
        this.applySuggestionToForm(category, sourceTranslation);
      })
      .finally(() => {
        if (this.targetLanguage() === target) {
          this.loading.set(false);
        }
      });
  }

  private loadStaleSuggestion(
    slug: string,
    category: ResourceCategory,
    targetLanguage: ContentLanguage,
    sourceLanguage: ContentLanguage,
    sourceTranslation: Record<string, unknown>,
  ): void {
    const cached = this.staleSuggestionCache.get<Record<string, unknown>, Record<string, unknown>>(
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
        { language: sourceLanguage, fields: this.translatableFields(category, sourceTranslation) },
        targetLanguage,
      )
      .then((result) => {
        this.staleSuggestionCache.set(slug, targetLanguage, sourceTranslation, result);
        this.staleSuggestion.set(result);
      })
      .catch(() => {
        const resourceForm = this.language.t().resources.resourceForm;
        this.snackBar.open(resourceForm.suggestionFailedNotice, resourceForm.suggestionFailedDismiss);
      })
      .finally(() => {
        this.staleSuggestionLoading.set(false);
      });
  }

  private translatableFields(
    category: ResourceCategory,
    translation: Record<string, unknown>,
  ): Record<string, unknown> {
    const fields: Record<string, unknown> = {
      title: translation['title'],
      shortDescription: translation['shortDescription'],
    };
    for (const key of TRANSLATED_FIELD_KEYS[category]) {
      fields[key] = translation[key];
    }
    return fields;
  }

  private applySuggestionToForm(category: ResourceCategory, result: Record<string, unknown>): void {
    this.form.patchValue(
      {
        title: (result['title'] as string) ?? '',
        shortDescription: (result['shortDescription'] as string) ?? '',
      },
      { emitEvent: false },
    );
    const translatedKeys = TRANSLATED_FIELD_KEYS[category];
    if (translatedKeys.length > 0) {
      const current = this.form.controls.categoryFields.value;
      const patched = { ...current };
      for (const key of translatedKeys) {
        if (key in result) {
          patched[key] = result[key];
        }
      }
      this.form.controls.categoryFields.setValue(patched, { emitEvent: false });
    }
  }

  private async persist(): Promise<Resource> {
    const { title, slug, shortDescription, categoryFields } = this.form.getRawValue();
    const category = this.category();
    const sharedKeys = SHARED_FIELD_KEYS[category];
    const sharedFields: Record<string, unknown> = {};
    const translation: Record<string, unknown> = { title, shortDescription };
    for (const [key, value] of Object.entries(categoryFields)) {
      if (sharedKeys.includes(key)) {
        sharedFields[key] = value;
      } else {
        translation[key] = value;
      }
    }

    const existing = this.resource();
    if (existing) {
      await this.resourceService.updateSharedFields(existing.id, sharedFields);
      return this.resourceService.saveTranslation(
        existing.id,
        this.targetLanguage(),
        translation as unknown as ResourceTranslation,
        slug,
      );
    }

    const createInput = {
      category,
      slug,
      sharedFields,
      language: this.targetLanguage(),
      translation,
    } as unknown as ResourceCreateInput;
    return this.resourceService.create(createInput);
  }
}

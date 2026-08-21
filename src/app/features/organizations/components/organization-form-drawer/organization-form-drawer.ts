import { ChangeDetectionStrategy, Component, effect, inject, input, output, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, ValidatorFn, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar } from '@angular/material/snack-bar';
import {
  Organization,
  OrganizationScopeType,
  OrganizationTranslation,
  OrganizationType,
} from '../../models/organization.model';
import { ContentLanguage, CONTENT_LANGUAGE_LABELS } from '../../../guide/models/content-language.model';
import { COUNTRY_CODES, countryDisplayName } from '../../../../shared/models/country.model';
import { OrganizationSharedFields, OrganizationService } from '../../services/organization.service';
import { TranslationSuggestionService } from '../../../../shared/services/translation-suggestion.service';
import { StaleTranslationSuggestionCache } from '../../../../shared/services/stale-translation-suggestion-cache.service';
import { MarkdownEditor } from '../../../../shared/components/markdown-editor/markdown-editor';
import { ImageGalleryInput } from '../../../../shared/components/image-gallery-input/image-gallery-input';
import { slugify } from '../../../../shared/utils/slugify';
import { URL_PATTERN, SLUG_PATTERN } from '../../../../shared/utils/patterns';
import { resolveImagePayload } from '../../../../shared/utils/image-payload';
import { ImageValue } from '../../../../shared/models/image-value.model';
import { GalleryImageValue } from '../../../../shared/models/gallery-image-value.model';
import { atLeastOneGalleryImage } from '../../../../shared/utils/gallery-validators';
import { GALLERY_IMAGE_DESCRIPTION_MAX_LENGTH } from '../../../../shared/utils/gallery-limits';
import { DESCRIPTION_MAX_LENGTH, NAME_MAX_LENGTH } from '../../utils/field-limits';
import { LanguageService } from '../../../../core/i18n/language.service';

@Component({
  selector: 'app-organization-form-drawer',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MarkdownEditor,
    ImageGalleryInput,
  ],
  templateUrl: './organization-form-drawer.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganizationFormDrawer {
  private readonly organizationService = inject(OrganizationService);
  private readonly translationSuggestionService = inject(TranslationSuggestionService);
  private readonly staleSuggestionCache = inject(StaleTranslationSuggestionCache);
  private readonly snackBar = inject(MatSnackBar);
  protected readonly language = inject(LanguageService);
  protected readonly contentLanguageLabels = CONTENT_LANGUAGE_LABELS;
  protected readonly nameMaxLength = NAME_MAX_LENGTH;
  protected readonly descriptionMaxLength = DESCRIPTION_MAX_LENGTH;
  protected readonly galleryDescriptionMaxLength = GALLERY_IMAGE_DESCRIPTION_MAX_LENGTH;
  protected readonly countryOptions = [...COUNTRY_CODES]
    .map((code) => ({ code, label: countryDisplayName(code, this.language.language()) }))
    .sort((a, b) => a.label.localeCompare(b.label));

  readonly organization = input<Organization | undefined>(undefined);
  readonly targetLanguage = input.required<ContentLanguage>();
  readonly sourceLanguage = input<ContentLanguage | undefined>(undefined);
  readonly staleSourceLanguage = input<ContentLanguage | undefined>(undefined);

  readonly saved = output<void>();
  readonly cancelled = output<void>();

  readonly loading = signal(false);
  readonly staleSuggestion = signal<OrganizationTranslation | undefined>(undefined);
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
    const currentSlug = this.organization()?.slug;
    const isDuplicate = this.organizationService
      .organizations()
      .some((org) => org.slug !== currentSlug && org.slug.toLowerCase() === slug);
    return isDuplicate ? { duplicateSlug: true } : null;
  };

  private readonly countryCodeRequiredValidator: ValidatorFn = (control) =>
    control.parent?.get('scopeType')?.value === 'country' && !control.value
      ? { countryCodeRequired: true }
      : null;

  private readonly cityRequiredValidator: ValidatorFn = (control) =>
    control.parent?.get('scopeType')?.value === 'city' && !control.value ? { cityRequired: true } : null;

  readonly form = new FormGroup({
    type: new FormControl<OrganizationType>('local-group', { nonNullable: true }),
    name: new FormControl('', { nonNullable: true, validators: Validators.required }),
    slug: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(SLUG_PATTERN), this.duplicateSlugValidator],
    }),
    description: new FormControl('', { nonNullable: true, validators: Validators.required }),
    images: new FormControl<GalleryImageValue[]>([], {
      nonNullable: true,
      validators: atLeastOneGalleryImage,
    }),
    videoUrl: new FormControl('', { nonNullable: true, validators: Validators.pattern(URL_PATTERN) }),
    scopeType: new FormControl<OrganizationScopeType>('global', { nonNullable: true }),
    countryCode: new FormControl<string | null>(null, { validators: this.countryCodeRequiredValidator }),
    city: new FormControl<string | null>(null, { validators: this.cityRequiredValidator }),
    website: new FormControl('', { nonNullable: true, validators: Validators.pattern(URL_PATTERN) }),
    instagram: new FormControl('', { nonNullable: true, validators: Validators.pattern(URL_PATTERN) }),
    telegram: new FormControl('', { nonNullable: true, validators: Validators.pattern(URL_PATTERN) }),
    whatsapp: new FormControl('', { nonNullable: true, validators: Validators.pattern(URL_PATTERN) }),
    volunteerFormUrl: new FormControl('', { nonNullable: true, validators: Validators.pattern(URL_PATTERN) }),
  });

  constructor() {
    this.form.controls.scopeType.valueChanges.subscribe((scopeType) => {
      if (scopeType !== 'country') {
        this.form.controls.countryCode.setValue(null, { emitEvent: false });
      }
      if (scopeType !== 'city') {
        this.form.controls.city.setValue(null, { emitEvent: false });
      }
      this.form.controls.countryCode.updateValueAndValidity();
      this.form.controls.city.updateValueAndValidity();
    });

    this.form.controls.name.valueChanges.subscribe((name) => {
      if (!this.slugManuallyEdited()) {
        this.form.controls.slug.setValue(slugify(name), { emitEvent: false });
      }
    });
    this.form.controls.slug.valueChanges.subscribe(() => {
      this.slugManuallyEdited.set(true);
    });

    effect(() => {
      const organization = this.organization();
      const targetLanguage = this.targetLanguage();
      const sourceLanguage = this.sourceLanguage();
      const staleSource = this.staleSourceLanguage();
      const existing = organization?.translations[targetLanguage];

      this.slugManuallyEdited.set(false);
      this.staleSuggestion.set(undefined);
      this.staleSuggestionLoading.set(false);
      this.previewRevealed.set(false);

      this.form.reset(
        {
          type: organization?.type ?? 'local-group',
          name: existing?.name ?? '',
          slug: organization?.slug ?? '',
          description: existing?.description ?? '',
          images: (organization?.images ?? []).map((image) => ({
            image: { kind: 'url', url: image.url } as ImageValue,
            description: image.description,
          })),
          videoUrl: organization?.videoUrl ?? '',
          scopeType: organization?.scopeType ?? 'global',
          countryCode: organization?.countryCode ?? null,
          city: organization?.city ?? null,
          website: organization?.contactLinks.website ?? '',
          instagram: organization?.contactLinks.instagram ?? '',
          telegram: organization?.contactLinks.telegram ?? '',
          whatsapp: organization?.contactLinks.whatsapp ?? '',
          volunteerFormUrl: organization?.contactLinks.volunteerFormUrl ?? '',
        },
        { emitEvent: false },
      );

      if (organization) {
        this.form.controls.type.disable({ emitEvent: false });
      } else {
        this.form.controls.type.enable({ emitEvent: false });
      }

      if (!existing && organization && sourceLanguage && !this.suggestionRequested) {
        const sourceTranslation = organization.translations[sourceLanguage];
        if (sourceTranslation) {
          this.suggestionRequested = true;
          this.requestSuggestion(targetLanguage, sourceLanguage, sourceTranslation);
        }
      }

      if (existing && organization && staleSource && !this.staleSuggestionRequested) {
        const sourceTranslation = organization.translations[staleSource];
        if (sourceTranslation) {
          this.staleSuggestionRequested = true;
          this.loadStaleSuggestion(organization.slug, targetLanguage, staleSource, sourceTranslation);
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
      suggestion.name !== this.form.controls.name.value ||
      suggestion.description !== this.form.controls.description.value
    );
  }

  protected acceptSuggestion(): void {
    const suggestion = this.staleSuggestion();
    if (!suggestion) {
      return;
    }
    this.form.patchValue({ name: suggestion.name, description: suggestion.description }, { emitEvent: false });
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
      const organization = await this.persist();
      await this.organizationService.publish(organization.id);
      this.saved.emit();
    } catch {
      this.notifyActionFailed();
    }
  }

  protected cancel(): void {
    this.cancelled.emit();
  }

  private notifyActionFailed(): void {
    const form = this.language.t().organizations.organizationForm;
    this.snackBar.open(form.actionFailedNotice, form.actionFailedDismiss);
  }

  private requestSuggestion(
    target: ContentLanguage,
    sourceLanguage: ContentLanguage,
    sourceTranslation: OrganizationTranslation,
  ): void {
    this.loading.set(true);
    this.translationSuggestionService
      .suggest({ language: sourceLanguage, fields: { ...sourceTranslation } }, target)
      .then((result) => {
        if (this.targetLanguage() !== target) {
          return;
        }
        this.applySuggestionToForm(result as unknown as OrganizationTranslation);
      })
      .catch(() => {
        if (this.targetLanguage() !== target) {
          return;
        }
        const organizationForm = this.language.t().organizations.organizationForm;
        this.snackBar.open(organizationForm.suggestionFailedNotice, organizationForm.suggestionFailedDismiss);
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
    sourceTranslation: OrganizationTranslation,
  ): void {
    const cached = this.staleSuggestionCache.get<OrganizationTranslation, OrganizationTranslation>(
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
        const translation = result as unknown as OrganizationTranslation;
        this.staleSuggestionCache.set(slug, targetLanguage, sourceTranslation, translation);
        this.staleSuggestion.set(translation);
      })
      .catch(() => {
        const organizationForm = this.language.t().organizations.organizationForm;
        this.snackBar.open(organizationForm.suggestionFailedNotice, organizationForm.suggestionFailedDismiss);
      })
      .finally(() => {
        this.staleSuggestionLoading.set(false);
      });
  }

  private applySuggestionToForm(result: OrganizationTranslation): void {
    this.form.patchValue(
      { name: result.name ?? '', description: result.description ?? '' },
      { emitEvent: false },
    );
  }

  private async persist(): Promise<Organization> {
    const {
      type,
      name,
      slug,
      description,
      images,
      videoUrl,
      scopeType,
      countryCode,
      city,
      website,
      instagram,
      telegram,
      whatsapp,
      volunteerFormUrl,
    } = this.form.getRawValue();

    const translation: OrganizationTranslation = { name, description };
    const imagesPayload = await Promise.all(
      images
        .filter((row): row is GalleryImageValue & { image: ImageValue } => row.image !== undefined)
        .map(async (row) => ({
          ...(await resolveImagePayload(row.image)),
          description: row.description,
        })),
    );
    const sharedFields: OrganizationSharedFields = {
      images: imagesPayload,
      videoUrl,
      scopeType,
      countryCode: scopeType === 'country' ? (countryCode ?? undefined) : undefined,
      city: scopeType === 'city' ? (city ?? undefined) : undefined,
      contactLinks: {
        website: website || undefined,
        instagram: instagram || undefined,
        telegram: telegram || undefined,
        whatsapp: whatsapp || undefined,
        volunteerFormUrl: volunteerFormUrl || undefined,
      },
    };

    const existing = this.organization();
    if (existing) {
      await this.organizationService.updateSharedFields(existing.id, sharedFields);
      return this.organizationService.saveTranslation(existing.id, this.targetLanguage(), translation, slug);
    }

    return this.organizationService.create({
      type,
      slug,
      sharedFields,
      language: this.targetLanguage(),
      translation,
    });
  }
}

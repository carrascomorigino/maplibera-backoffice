import { ChangeDetectionStrategy, Component, effect, inject, input, output, signal } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, ValidatorFn, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar } from '@angular/material/snack-bar';
import {
  Professional,
  ProfessionalScopeType,
  ProfessionalSpecialty,
  ProfessionalTranslation,
} from '../../models/professional.model';
import { ContentLanguage, CONTENT_LANGUAGE_LABELS } from '../../../guide/models/content-language.model';
import { COUNTRY_CODES, countryDisplayName } from '../../../../shared/models/country.model';
import { ProfessionalCreateInput, ProfessionalService } from '../../services/professional.service';
import { TranslationSuggestionService } from '../../../../shared/services/translation-suggestion.service';
import { StaleTranslationSuggestionCache } from '../../../../shared/services/stale-translation-suggestion-cache.service';
import { MarkdownEditor } from '../../../../shared/components/markdown-editor/markdown-editor';
import { NutritionistFieldsForm } from '../specialty-fields/nutritionist-fields-form/nutritionist-fields-form';
import { DoctorFieldsForm } from '../specialty-fields/doctor-fields-form/doctor-fields-form';
import { DentistFieldsForm } from '../specialty-fields/dentist-fields-form/dentist-fields-form';
import { CoachFieldsForm } from '../specialty-fields/coach-fields-form/coach-fields-form';
import { slugify } from '../../../../shared/utils/slugify';
import { URL_PATTERN, SLUG_PATTERN } from '../../../../shared/utils/patterns';
import { BIO_MAX_LENGTH, CREDENTIALS_TITLE_MAX_LENGTH, NAME_MAX_LENGTH } from '../../utils/field-limits';
import { LanguageService } from '../../../../core/i18n/language.service';

const SHARED_FIELD_KEYS: Record<ProfessionalSpecialty, readonly string[]> = {
  nutritionist: ['licenseNumber', 'dietarySpecialties'],
  doctor: ['medicalLicenseNumber', 'medicalSpecialty'],
  dentist: ['licenseNumber', 'acceptsChildren'],
  coach: ['certifications', 'coachingAreas'],
};

const DEFAULT_SPECIALTY_FIELDS: Record<ProfessionalSpecialty, Record<string, unknown>> = {
  nutritionist: { licenseNumber: '', dietarySpecialties: [] },
  doctor: { medicalLicenseNumber: '', medicalSpecialty: '' },
  dentist: { licenseNumber: '', acceptsChildren: false },
  coach: { certifications: [], coachingAreas: [] },
};

@Component({
  selector: 'app-professional-form-drawer',
  imports: [
    ReactiveFormsModule,
    NgOptimizedImage,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MarkdownEditor,
    NutritionistFieldsForm,
    DoctorFieldsForm,
    DentistFieldsForm,
    CoachFieldsForm,
  ],
  templateUrl: './professional-form-drawer.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfessionalFormDrawer {
  private readonly professionalService = inject(ProfessionalService);
  private readonly translationSuggestionService = inject(TranslationSuggestionService);
  private readonly staleSuggestionCache = inject(StaleTranslationSuggestionCache);
  private readonly snackBar = inject(MatSnackBar);
  protected readonly language = inject(LanguageService);
  protected readonly contentLanguageLabels = CONTENT_LANGUAGE_LABELS;
  protected readonly nameMaxLength = NAME_MAX_LENGTH;
  protected readonly credentialsTitleMaxLength = CREDENTIALS_TITLE_MAX_LENGTH;
  protected readonly bioMaxLength = BIO_MAX_LENGTH;
  protected readonly countryOptions = [...COUNTRY_CODES]
    .map((code) => ({ code, label: countryDisplayName(code, this.language.language()) }))
    .sort((a, b) => a.label.localeCompare(b.label));

  readonly professional = input<Professional | undefined>(undefined);
  readonly specialty = input.required<ProfessionalSpecialty>();
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
    const currentSlug = this.professional()?.slug;
    const isDuplicate = this.professionalService
      .professionals()
      .some((professional) => professional.slug !== currentSlug && professional.slug.toLowerCase() === slug);
    return isDuplicate ? { duplicateSlug: true } : null;
  };

  private readonly countryCodeRequiredValidator: ValidatorFn = (control) =>
    control.parent?.get('scopeType')?.value === 'country' && !control.value
      ? { countryCodeRequired: true }
      : null;

  private readonly cityRequiredValidator: ValidatorFn = (control) =>
    control.parent?.get('scopeType')?.value === 'city' && !control.value ? { cityRequired: true } : null;

  readonly form = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: Validators.required }),
    slug: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(SLUG_PATTERN), this.duplicateSlugValidator],
    }),
    credentialsTitle: new FormControl('', { nonNullable: true, validators: Validators.required }),
    bio: new FormControl('', { nonNullable: true, validators: Validators.required }),
    photoUrl: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(URL_PATTERN)],
    }),
    scopeType: new FormControl<ProfessionalScopeType>('global', { nonNullable: true }),
    countryCode: new FormControl<string | null>(null, { validators: this.countryCodeRequiredValidator }),
    city: new FormControl<string | null>(null, { validators: this.cityRequiredValidator }),
    website: new FormControl('', { nonNullable: true, validators: Validators.pattern(URL_PATTERN) }),
    instagram: new FormControl('', { nonNullable: true, validators: Validators.pattern(URL_PATTERN) }),
    telegram: new FormControl('', { nonNullable: true, validators: Validators.pattern(URL_PATTERN) }),
    whatsapp: new FormControl('', { nonNullable: true, validators: Validators.pattern(URL_PATTERN) }),
    bookingUrl: new FormControl('', { nonNullable: true, validators: Validators.pattern(URL_PATTERN) }),
    specialtyFields: new FormControl<Record<string, unknown>>({}, { nonNullable: true }),
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
      const professional = this.professional();
      const specialty = this.specialty();
      const targetLanguage = this.targetLanguage();
      const sourceLanguage = this.sourceLanguage();
      const staleSource = this.staleSourceLanguage();
      const existing = professional?.translations[targetLanguage];

      this.slugManuallyEdited.set(false);
      this.staleSuggestion.set(undefined);
      this.staleSuggestionLoading.set(false);
      this.previewRevealed.set(false);

      const sharedValues: Record<string, unknown> = {};
      if (professional) {
        for (const key of SHARED_FIELD_KEYS[specialty]) {
          sharedValues[key] = (professional as unknown as Record<string, unknown>)[key];
        }
      }

      this.form.reset(
        {
          name: existing?.name ?? '',
          slug: professional?.slug ?? '',
          credentialsTitle: existing?.credentialsTitle ?? '',
          bio: existing?.bio ?? '',
          photoUrl: professional?.photoUrl ?? '',
          scopeType: professional?.scopeType ?? 'global',
          countryCode: professional?.countryCode ?? null,
          city: professional?.city ?? null,
          website: professional?.contactLinks.website ?? '',
          instagram: professional?.contactLinks.instagram ?? '',
          telegram: professional?.contactLinks.telegram ?? '',
          whatsapp: professional?.contactLinks.whatsapp ?? '',
          bookingUrl: professional?.contactLinks.bookingUrl ?? '',
          specialtyFields: { ...DEFAULT_SPECIALTY_FIELDS[specialty], ...sharedValues },
        },
        { emitEvent: false },
      );

      if (!existing && professional && sourceLanguage && !this.suggestionRequested) {
        const sourceTranslation = professional.translations[sourceLanguage];
        if (sourceTranslation) {
          this.suggestionRequested = true;
          this.requestSuggestion(targetLanguage, sourceLanguage, sourceTranslation);
        }
      }

      if (existing && professional && staleSource && !this.staleSuggestionRequested) {
        const sourceTranslation = professional.translations[staleSource];
        if (sourceTranslation) {
          this.staleSuggestionRequested = true;
          this.loadStaleSuggestion(professional.slug, targetLanguage, staleSource, sourceTranslation);
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
      suggestion['name'] !== this.form.controls.name.value ||
      suggestion['credentialsTitle'] !== this.form.controls.credentialsTitle.value ||
      suggestion['bio'] !== this.form.controls.bio.value
    );
  }

  protected acceptSuggestion(): void {
    const suggestion = this.staleSuggestion();
    if (!suggestion) {
      return;
    }
    this.form.patchValue(
      {
        name: (suggestion['name'] as string) ?? '',
        credentialsTitle: (suggestion['credentialsTitle'] as string) ?? '',
        bio: (suggestion['bio'] as string) ?? '',
      },
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
      const professional = await this.persist();
      await this.professionalService.publish(professional.id);
      this.saved.emit();
    } catch {
      this.notifyActionFailed();
    }
  }

  protected cancel(): void {
    this.cancelled.emit();
  }

  private notifyActionFailed(): void {
    const form = this.language.t().professionals.professionalForm;
    this.snackBar.open(form.actionFailedNotice, form.actionFailedDismiss);
  }

  private requestSuggestion(
    target: ContentLanguage,
    sourceLanguage: ContentLanguage,
    sourceTranslation: ProfessionalTranslation,
  ): void {
    this.loading.set(true);
    this.translationSuggestionService
      .suggest({ language: sourceLanguage, fields: { ...sourceTranslation } }, target)
      .then((result) => {
        if (this.targetLanguage() !== target) {
          return;
        }
        this.applySuggestionToForm(result);
      })
      .catch(() => {
        if (this.targetLanguage() !== target) {
          return;
        }
        const professionalForm = this.language.t().professionals.professionalForm;
        this.snackBar.open(professionalForm.suggestionFailedNotice, professionalForm.suggestionFailedDismiss);
        this.applySuggestionToForm({ ...sourceTranslation });
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
    sourceTranslation: ProfessionalTranslation,
  ): void {
    const cached = this.staleSuggestionCache.get<ProfessionalTranslation, Record<string, unknown>>(
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
        this.staleSuggestionCache.set(slug, targetLanguage, sourceTranslation, result);
        this.staleSuggestion.set(result);
      })
      .catch(() => {
        const professionalForm = this.language.t().professionals.professionalForm;
        this.snackBar.open(professionalForm.suggestionFailedNotice, professionalForm.suggestionFailedDismiss);
      })
      .finally(() => {
        this.staleSuggestionLoading.set(false);
      });
  }

  private applySuggestionToForm(result: Record<string, unknown>): void {
    this.form.patchValue(
      {
        name: (result['name'] as string) ?? '',
        credentialsTitle: (result['credentialsTitle'] as string) ?? '',
        bio: (result['bio'] as string) ?? '',
      },
      { emitEvent: false },
    );
  }

  private async persist(): Promise<Professional> {
    const {
      name,
      slug,
      credentialsTitle,
      bio,
      photoUrl,
      scopeType,
      countryCode,
      city,
      website,
      instagram,
      telegram,
      whatsapp,
      bookingUrl,
      specialtyFields,
    } = this.form.getRawValue();
    const specialty = this.specialty();

    const translation: ProfessionalTranslation = { name, credentialsTitle, bio };
    const sharedFields: Record<string, unknown> = {
      photoUrl,
      scopeType,
      countryCode: scopeType === 'country' ? (countryCode ?? undefined) : undefined,
      city: scopeType === 'city' ? (city ?? undefined) : undefined,
      contactLinks: {
        website: website || undefined,
        instagram: instagram || undefined,
        telegram: telegram || undefined,
        whatsapp: whatsapp || undefined,
        bookingUrl: bookingUrl || undefined,
      },
      ...specialtyFields,
    };

    const existing = this.professional();
    if (existing) {
      await this.professionalService.updateSharedFields(existing.id, sharedFields);
      return this.professionalService.saveTranslation(existing.id, this.targetLanguage(), translation, slug);
    }

    const createInput = {
      specialty,
      slug,
      sharedFields,
      language: this.targetLanguage(),
      translation,
    } as unknown as ProfessionalCreateInput;
    return this.professionalService.create(createInput);
  }
}

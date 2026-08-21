import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { CdkDragHandle } from '@angular/cdk/drag-drop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Professional, ProfessionalStatus } from '../../models/professional.model';
import {
  ContentLanguage,
  CONTENT_LANGUAGES,
  CONTENT_LANGUAGE_LABELS,
} from '../../../guide/models/content-language.model';
import { countryDisplayName } from '../../../../shared/models/country.model';
import { ProfessionalService } from '../../services/professional.service';
import { LanguageService } from '../../../../core/i18n/language.service';
import { LanguageTags } from '../../../../shared/components/language-tags/language-tags';
import { ConfirmDialog } from '../../../../shared/components/confirm-dialog/confirm-dialog';

export interface ProfessionalEditRequestedEvent {
  professional: Professional;
  targetLanguage: ContentLanguage;
  staleSourceLanguage?: ContentLanguage;
}

export interface ProfessionalTranslateRequestedEvent {
  professional: Professional;
  sourceLanguage: ContentLanguage;
  targetLanguage: ContentLanguage;
}

interface ContactLinkEntry {
  key: string;
  url: string;
  ariaLabel: string;
  icon: string;
}

@Component({
  selector: 'app-professional-card',
  imports: [NgOptimizedImage, CdkDragHandle, MatButtonModule, MatIconModule, LanguageTags],
  templateUrl: './professional-card.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class:
      'flex flex-col gap-2 rounded-xl border border-ink-100 bg-surface-card p-3 shadow-[0_1px_2px_-1px_rgba(23,21,31,0.06),0_1px_3px_rgba(23,21,31,0.04)] transition-shadow hover:shadow-[0_2px_4px_-1px_rgba(23,21,31,0.08),0_4px_8px_rgba(23,21,31,0.05)]',
  },
})
export class ProfessionalCard {
  private readonly professionalService = inject(ProfessionalService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  protected readonly language = inject(LanguageService);
  protected readonly contentLanguages = CONTENT_LANGUAGES;
  protected readonly contentLanguageLabels = CONTENT_LANGUAGE_LABELS;

  readonly professional = input.required<Professional>();

  readonly editRequested = output<ProfessionalEditRequestedEvent>();
  readonly translateRequested = output<ProfessionalTranslateRequestedEvent>();

  private readonly _selectedLanguage = signal<ContentLanguage | undefined>(undefined);

  readonly selectedLanguage = computed<ContentLanguage>(
    () => this._selectedLanguage() ?? this.initialLanguageFor(this.professional()),
  );

  readonly translation = computed(() => this.professional().translations[this.selectedLanguage()]);

  readonly availableLanguages = computed(
    () => this.contentLanguages.filter((lang) => this.professional().translations[lang]) as ContentLanguage[],
  );

  readonly specialtyBadgeLabel = computed<string>(() => {
    const labels = this.language.t().professionals.professionalsList;
    switch (this.professional().specialty) {
      case 'nutritionist':
        return labels.specialtyBadgeNutritionist;
      case 'doctor':
        return labels.specialtyBadgeDoctor;
      case 'dentist':
        return labels.specialtyBadgeDentist;
      case 'coach':
        return labels.specialtyBadgeCoach;
    }
  });

  readonly scopeLabel = computed<string>(() => {
    const professional = this.professional();
    const labels = this.language.t().professionals.professionalsList;
    if (professional.scopeType === 'country' && professional.countryCode) {
      return countryDisplayName(professional.countryCode, this.language.language());
    }
    if (professional.scopeType === 'city' && professional.city) {
      return professional.city;
    }
    return labels.scopeGlobalLabel;
  });

  readonly contactLinkEntries = computed<ContactLinkEntry[]>(() => {
    const links = this.professional().contactLinks;
    const labels = this.language.t().professionals.professionalsList;
    const entries: ContactLinkEntry[] = [];
    if (links.website) {
      entries.push({ key: 'website', url: links.website, ariaLabel: labels.contactLinkWebsiteAria, icon: 'language' });
    }
    if (links.instagram) {
      entries.push({
        key: 'instagram',
        url: links.instagram,
        ariaLabel: labels.contactLinkInstagramAria,
        icon: 'photo_camera',
      });
    }
    if (links.telegram) {
      entries.push({ key: 'telegram', url: links.telegram, ariaLabel: labels.contactLinkTelegramAria, icon: 'send' });
    }
    if (links.whatsapp) {
      entries.push({ key: 'whatsapp', url: links.whatsapp, ariaLabel: labels.contactLinkWhatsappAria, icon: 'chat' });
    }
    if (links.bookingUrl) {
      entries.push({
        key: 'booking',
        url: links.bookingUrl,
        ariaLabel: labels.contactLinkBookingAria,
        icon: 'event_available',
      });
    }
    return entries;
  });

  protected onLanguageSelected(newLanguage: ContentLanguage): void {
    this._selectedLanguage.set(newLanguage);

    const staleSourceLanguage = this.professional().staleLanguages?.[newLanguage];
    if (staleSourceLanguage) {
      this.editRequested.emit({
        professional: this.professional(),
        targetLanguage: newLanguage,
        staleSourceLanguage,
      });
    }
  }

  protected onTranslateRequested(newLanguage: ContentLanguage): void {
    const previous = this.selectedLanguage();
    this._selectedLanguage.set(newLanguage);
    this.translateRequested.emit({
      professional: this.professional(),
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
        this.professionalService
          .removeTranslation(this.professional().id, lang)
          .catch(() => this.notifyActionFailed());
      }
    });
  }

  protected onEdit(): void {
    const targetLanguage = this.selectedLanguage();
    this.editRequested.emit({
      professional: this.professional(),
      targetLanguage,
      staleSourceLanguage: this.professional().staleLanguages?.[targetLanguage],
    });
  }

  protected statusActionLabel(status: ProfessionalStatus): string {
    const labels = this.language.t().professionals.professionalsList;
    return status === 'published' ? labels.pauseAction : labels.publishAction;
  }

  protected onStatusAction(): void {
    const professional = this.professional();
    const action =
      professional.status === 'published'
        ? this.professionalService.pause(professional.id)
        : this.professionalService.publish(professional.id);
    action.catch(() => this.notifyActionFailed());
  }

  private notifyActionFailed(): void {
    const form = this.language.t().professionals.professionalForm;
    this.snackBar.open(form.actionFailedNotice, form.actionFailedDismiss);
  }

  protected statusBadgeClass(status: ProfessionalStatus): string {
    switch (status) {
      case 'published':
        return 'bg-emerald-50 text-emerald-700';
      case 'paused':
        return 'bg-gold-100 text-gold-800';
      default:
        return 'bg-ink-100 text-ink-600';
    }
  }

  private initialLanguageFor(professional: Professional): ContentLanguage {
    const uiLanguage = this.language.language();
    if (professional.translations[uiLanguage]) {
      return uiLanguage;
    }
    const [first] = this.contentLanguages.filter((lang) => professional.translations[lang]);
    return first ?? uiLanguage;
  }
}

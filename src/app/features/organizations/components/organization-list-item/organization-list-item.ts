import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { Organization, OrganizationStatus } from '../../models/organization.model';
import {
  ContentLanguage,
  CONTENT_LANGUAGES,
  CONTENT_LANGUAGE_LABELS,
} from '../../../guide/models/content-language.model';
import { countryDisplayName } from '../../../../shared/models/country.model';
import { OrganizationService } from '../../services/organization.service';
import { LanguageService } from '../../../../core/i18n/language.service';
import { LanguageTags } from '../../../../shared/components/language-tags/language-tags';
import { ConfirmDialog } from '../../../../shared/components/confirm-dialog/confirm-dialog';

export interface OrganizationEditRequestedEvent {
  organization: Organization;
  targetLanguage: ContentLanguage;
  staleSourceLanguage?: ContentLanguage;
}

export interface OrganizationTranslateRequestedEvent {
  organization: Organization;
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
  selector: 'app-organization-list-item',
  imports: [MatButtonModule, MatIconModule, LanguageTags],
  templateUrl: './organization-list-item.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class:
      'flex flex-col gap-2 rounded-xl border border-ink-100 bg-surface-card p-3 shadow-[0_1px_2px_-1px_rgba(23,21,31,0.06),0_1px_3px_rgba(23,21,31,0.04)] transition-shadow hover:shadow-[0_2px_4px_-1px_rgba(23,21,31,0.08),0_4px_8px_rgba(23,21,31,0.05)]',
  },
})
export class OrganizationListItem {
  private readonly organizationService = inject(OrganizationService);
  private readonly dialog = inject(MatDialog);
  protected readonly language = inject(LanguageService);
  protected readonly contentLanguages = CONTENT_LANGUAGES;
  protected readonly contentLanguageLabels = CONTENT_LANGUAGE_LABELS;

  readonly organization = input.required<Organization>();

  readonly editRequested = output<OrganizationEditRequestedEvent>();
  readonly translateRequested = output<OrganizationTranslateRequestedEvent>();

  private readonly _selectedLanguage = signal<ContentLanguage | undefined>(undefined);

  readonly selectedLanguage = computed<ContentLanguage>(
    () => this._selectedLanguage() ?? this.initialLanguageFor(this.organization()),
  );

  readonly translation = computed(() => this.organization().translations[this.selectedLanguage()]);

  readonly availableLanguages = computed(
    () => this.contentLanguages.filter((lang) => this.organization().translations[lang]) as ContentLanguage[],
  );

  readonly typeBadgeLabel = computed<string>(() => {
    const labels = this.language.t().organizations.organizationsList;
    switch (this.organization().type) {
      case 'local-group':
        return labels.typeBadgeLocalGroup;
      case 'ngo':
        return labels.typeBadgeNgo;
      case 'social-network':
        return labels.typeBadgeSocialNetwork;
      case 'campaign':
        return labels.typeBadgeCampaign;
    }
  });

  readonly scopeLabel = computed<string>(() => {
    const org = this.organization();
    const labels = this.language.t().organizations.organizationsList;
    if (org.scopeType === 'country' && org.countryCode) {
      return countryDisplayName(org.countryCode, this.language.language());
    }
    if (org.scopeType === 'city' && org.city) {
      return org.city;
    }
    return labels.scopeGlobalLabel;
  });

  readonly contactLinkEntries = computed<ContactLinkEntry[]>(() => {
    const links = this.organization().contactLinks;
    const labels = this.language.t().organizations.organizationsList;
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
    if (links.volunteerFormUrl) {
      entries.push({
        key: 'volunteer-form',
        url: links.volunteerFormUrl,
        ariaLabel: labels.contactLinkVolunteerFormAria,
        icon: 'volunteer_activism',
      });
    }
    return entries;
  });

  protected onLanguageSelected(newLanguage: ContentLanguage): void {
    this._selectedLanguage.set(newLanguage);

    const staleSourceLanguage = this.organization().staleLanguages?.[newLanguage];
    if (staleSourceLanguage) {
      this.editRequested.emit({
        organization: this.organization(),
        targetLanguage: newLanguage,
        staleSourceLanguage,
      });
    }
  }

  protected onTranslateRequested(newLanguage: ContentLanguage): void {
    const previous = this.selectedLanguage();
    this._selectedLanguage.set(newLanguage);
    this.translateRequested.emit({
      organization: this.organization(),
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
        this.organizationService.removeTranslation(this.organization().slug, lang);
      }
    });
  }

  protected onEdit(): void {
    const targetLanguage = this.selectedLanguage();
    this.editRequested.emit({
      organization: this.organization(),
      targetLanguage,
      staleSourceLanguage: this.organization().staleLanguages?.[targetLanguage],
    });
  }

  protected statusActionLabel(status: OrganizationStatus): string {
    const labels = this.language.t().organizations.organizationsList;
    return status === 'published' ? labels.pauseAction : labels.publishAction;
  }

  protected onStatusAction(): void {
    const org = this.organization();
    if (org.status === 'published') {
      this.organizationService.pause(org.slug);
    } else {
      this.organizationService.publish(org.slug);
    }
  }

  protected statusBadgeClass(status: OrganizationStatus): string {
    switch (status) {
      case 'published':
        return 'bg-emerald-50 text-emerald-700';
      case 'paused':
        return 'bg-gold-100 text-gold-800';
      default:
        return 'bg-ink-100 text-ink-600';
    }
  }

  private initialLanguageFor(organization: Organization): ContentLanguage {
    const uiLanguage = this.language.language();
    if (organization.translations[uiLanguage]) {
      return uiLanguage;
    }
    const [first] = this.contentLanguages.filter((lang) => organization.translations[lang]);
    return first ?? uiLanguage;
  }
}

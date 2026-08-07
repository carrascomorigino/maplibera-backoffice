import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { CdkDragHandle } from '@angular/cdk/drag-drop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';
import { Resource, ResourceStatus } from '../../models/resource.model';
import {
  ContentLanguage,
  CONTENT_LANGUAGES,
  CONTENT_LANGUAGE_LABELS,
} from '../../../guide/models/content-language.model';
import { ResourceService } from '../../services/resource.service';
import { LanguageService } from '../../../../core/i18n/language.service';
import { LanguageTags } from '../../../../shared/components/language-tags/language-tags';
import { ConfirmDialog } from '../../../../shared/components/confirm-dialog/confirm-dialog';

export interface ResourceEditRequestedEvent {
  resource: Resource;
  targetLanguage: ContentLanguage;
  staleSourceLanguage?: ContentLanguage;
}

export interface ResourceTranslateRequestedEvent {
  resource: Resource;
  sourceLanguage: ContentLanguage;
  targetLanguage: ContentLanguage;
}

@Component({
  selector: 'app-resource-card',
  imports: [CdkDragHandle, MatButtonModule, MatIconModule, LanguageTags],
  templateUrl: './resource-card.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'flex flex-col gap-2 rounded border border-gray-200 p-3',
  },
})
export class ResourceCard {
  private readonly resourceService = inject(ResourceService);
  private readonly dialog = inject(MatDialog);
  protected readonly language = inject(LanguageService);
  protected readonly contentLanguages = CONTENT_LANGUAGES;
  protected readonly contentLanguageLabels = CONTENT_LANGUAGE_LABELS;

  readonly resource = input.required<Resource>();

  readonly editRequested = output<ResourceEditRequestedEvent>();
  readonly translateRequested = output<ResourceTranslateRequestedEvent>();

  private readonly _selectedLanguage = signal<ContentLanguage | undefined>(undefined);

  readonly selectedLanguage = computed<ContentLanguage>(
    () => this._selectedLanguage() ?? this.initialLanguageFor(this.resource()),
  );

  readonly translation = computed(
    () => this.resource().translations[this.selectedLanguage()] as { title: string; shortDescription: string } | undefined,
  );

  readonly availableLanguages = computed(
    () => this.contentLanguages.filter((lang) => this.resource().translations[lang]) as ContentLanguage[],
  );

  readonly thumbnailUrl = computed<string | undefined>(() => {
    const resource = this.resource();
    switch (resource.category) {
      case 'recipes':
        return resource.photoUrls[0];
      case 'multimedia':
        return resource.posterUrl || undefined;
      case 'apps':
        return resource.iconUrl || undefined;
      case 'nutrition':
        return undefined;
    }
  });

  protected onLanguageSelected(newLanguage: ContentLanguage): void {
    this._selectedLanguage.set(newLanguage);

    const staleSourceLanguage = this.resource().staleLanguages?.[newLanguage];
    if (staleSourceLanguage) {
      this.editRequested.emit({
        resource: this.resource(),
        targetLanguage: newLanguage,
        staleSourceLanguage,
      });
    }
  }

  protected onTranslateRequested(newLanguage: ContentLanguage): void {
    const previous = this.selectedLanguage();
    this._selectedLanguage.set(newLanguage);
    this.translateRequested.emit({
      resource: this.resource(),
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
        this.resourceService.removeTranslation(this.resource().slug, lang);
      }
    });
  }

  protected onEdit(): void {
    const targetLanguage = this.selectedLanguage();
    this.editRequested.emit({
      resource: this.resource(),
      targetLanguage,
      staleSourceLanguage: this.resource().staleLanguages?.[targetLanguage],
    });
  }

  protected statusActionLabel(status: ResourceStatus): string {
    const labels = this.language.t().resources.resourcesList;
    return status === 'published' ? labels.pauseAction : labels.publishAction;
  }

  protected onStatusAction(): void {
    const resource = this.resource();
    if (resource.status === 'published') {
      this.resourceService.pause(resource.slug);
    } else {
      this.resourceService.publish(resource.slug);
    }
  }

  protected statusBadgeClass(status: ResourceStatus): string {
    switch (status) {
      case 'published':
        return 'bg-green-100 text-green-800';
      case 'paused':
        return 'bg-amber-100 text-amber-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  private initialLanguageFor(resource: Resource): ContentLanguage {
    const uiLanguage = this.language.language();
    if (resource.translations[uiLanguage]) {
      return uiLanguage;
    }
    const [first] = this.contentLanguages.filter((lang) => resource.translations[lang]);
    return first ?? uiLanguage;
  }
}

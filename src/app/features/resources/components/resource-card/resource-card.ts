import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { CdkDragHandle } from '@angular/cdk/drag-drop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
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
    class:
      'flex flex-col gap-2 rounded-xl border border-ink-100 bg-surface-card p-3 shadow-[0_1px_2px_-1px_rgba(23,21,31,0.06),0_1px_3px_rgba(23,21,31,0.04)] transition-shadow hover:shadow-[0_2px_4px_-1px_rgba(23,21,31,0.08),0_4px_8px_rgba(23,21,31,0.05)]',
  },
})
export class ResourceCard {
  private readonly resourceService = inject(ResourceService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
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
        this.resourceService.removeTranslation(this.resource().id, lang).catch(() => this.notifyActionFailed());
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
    const action = resource.status === 'published' ? this.resourceService.pause(resource.id) : this.resourceService.publish(resource.id);
    action.catch(() => this.notifyActionFailed());
  }

  private notifyActionFailed(): void {
    const form = this.language.t().resources.resourceForm;
    this.snackBar.open(form.actionFailedNotice, form.actionFailedDismiss);
  }

  protected statusBadgeClass(status: ResourceStatus): string {
    switch (status) {
      case 'published':
        return 'bg-emerald-50 text-emerald-700';
      case 'paused':
        return 'bg-gold-100 text-gold-800';
      default:
        return 'bg-ink-100 text-ink-600';
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

import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CdkDrag, CdkDragDrop, CdkDropList, moveItemInArray } from '@angular/cdk/drag-drop';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatDialog } from '@angular/material/dialog';
import { MatDrawer, MatDrawerContainer, MatDrawerContent } from '@angular/material/sidenav';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ORGANIZATION_TYPES, Organization, OrganizationType } from '../../models/organization.model';
import { ContentLanguage } from '../../../guide/models/content-language.model';
import { OrganizationService } from '../../services/organization.service';
import { OrganizationFormDrawer } from '../../components/organization-form-drawer/organization-form-drawer';
import {
  OrganizationEditRequestedEvent,
  OrganizationListItem,
  OrganizationTranslateRequestedEvent,
} from '../../components/organization-list-item/organization-list-item';
import { LanguageService } from '../../../../core/i18n/language.service';
import { ConfirmDialog } from '../../../../shared/components/confirm-dialog/confirm-dialog';
import { SelectionToolbar } from '../../../../shared/components/selection-toolbar/selection-toolbar';

type DrawerContext =
  | { mode: 'create' }
  | {
      mode: 'edit';
      organization: Organization;
      targetLanguage: ContentLanguage;
      staleSourceLanguage?: ContentLanguage;
    }
  | {
      mode: 'translate';
      organization: Organization;
      targetLanguage: ContentLanguage;
      sourceLanguage: ContentLanguage;
    };

@Component({
  selector: 'app-organizations-list',
  imports: [
    CdkDropList,
    CdkDrag,
    MatButtonModule,
    MatButtonToggleModule,
    MatDrawerContainer,
    MatDrawer,
    MatDrawerContent,
    OrganizationFormDrawer,
    OrganizationListItem,
    SelectionToolbar,
  ],
  templateUrl: './organizations-list.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganizationsListPage {
  private readonly organizationService = inject(OrganizationService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly dialog = inject(MatDialog);
  protected readonly language = inject(LanguageService);

  protected readonly types = ORGANIZATION_TYPES;
  protected readonly activeFilter = signal<OrganizationType | 'all'>('all');
  protected readonly visibleOrganizations = computed<Organization[]>(() => {
    const filter = this.activeFilter();
    const orgs = this.organizationService.organizations();
    return filter === 'all' ? orgs : orgs.filter((org) => org.type === filter);
  });

  protected readonly selectedIds = signal<ReadonlySet<string>>(new Set());
  protected readonly selectedCount = computed(() => this.selectedIds().size);

  protected readonly drawerContext = signal<DrawerContext | undefined>(undefined);
  protected readonly isDrawerOpen = computed(() => this.drawerContext() !== undefined);

  protected readonly drawerOrganization = computed<Organization | undefined>(() => {
    const ctx = this.drawerContext();
    return ctx && ctx.mode !== 'create' ? ctx.organization : undefined;
  });

  protected readonly drawerTargetLanguage = computed<ContentLanguage>(() => {
    const ctx = this.drawerContext();
    if (!ctx || ctx.mode === 'create') {
      return this.language.language();
    }
    return ctx.targetLanguage;
  });

  protected readonly drawerSourceLanguage = computed<ContentLanguage | undefined>(() => {
    const ctx = this.drawerContext();
    return ctx?.mode === 'translate' ? ctx.sourceLanguage : undefined;
  });

  protected readonly drawerStaleSourceLanguage = computed<ContentLanguage | undefined>(() => {
    const ctx = this.drawerContext();
    return ctx?.mode === 'edit' ? ctx.staleSourceLanguage : undefined;
  });

  protected openCreate(): void {
    this.drawerContext.set({ mode: 'create' });
  }

  protected openEdit(event: OrganizationEditRequestedEvent): void {
    this.drawerContext.set({
      mode: 'edit',
      organization: event.organization,
      targetLanguage: event.targetLanguage,
      staleSourceLanguage: event.staleSourceLanguage,
    });
  }

  protected openTranslate(event: OrganizationTranslateRequestedEvent): void {
    this.drawerContext.set({
      mode: 'translate',
      organization: event.organization,
      targetLanguage: event.targetLanguage,
      sourceLanguage: event.sourceLanguage,
    });
  }

  protected onSaved(): void {
    this.drawerContext.set(undefined);
  }

  protected onCancelled(): void {
    this.drawerContext.set(undefined);
  }

  onDrop(event: CdkDragDrop<Organization[]>): void {
    const ids = event.container.data.map((org) => org.id);
    moveItemInArray(ids, event.previousIndex, event.currentIndex);
    this.organizationService.reorder(ids).catch(() => {
      const form = this.language.t().organizations.organizationForm;
      this.snackBar.open(form.actionFailedNotice, form.actionFailedDismiss);
    });
  }

  protected filterLabel(type: OrganizationType): string {
    const labels = this.language.t().organizations.organizationsList;
    switch (type) {
      case 'local-group':
        return labels.filterLocalGroupLabel;
      case 'ngo':
        return labels.filterNgoLabel;
      case 'social-network':
        return labels.filterSocialNetworkLabel;
      case 'campaign':
        return labels.filterCampaignLabel;
    }
  }

  protected isSelected(id: string): boolean {
    return this.selectedIds().has(id);
  }

  protected toggleSelection(id: string): void {
    this.selectedIds.update((ids) => {
      const next = new Set(ids);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  protected clearSelection(): void {
    this.selectedIds.set(new Set());
  }

  protected requestBulkDelete(): void {
    const labels = this.language.t().bulkSelection;
    const dialogRef = this.dialog.open(ConfirmDialog, {
      data: {
        title: labels.deleteConfirmTitle,
        message: labels.deleteConfirmMessage(this.selectedCount()),
        confirmLabel: labels.deleteConfirmConfirmButton,
        cancelLabel: labels.deleteConfirmCancelButton,
      },
    });
    dialogRef.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        void this.performBulkDelete();
      }
    });
  }

  private async performBulkDelete(): Promise<void> {
    const ids = [...this.selectedIds()];
    try {
      await Promise.all(ids.map((id) => this.organizationService.delete(id)));
      this.clearSelection();
    } catch {
      const labels = this.language.t().bulkSelection;
      this.snackBar.open(labels.actionFailedNotice, labels.actionFailedDismiss);
    }
  }
}

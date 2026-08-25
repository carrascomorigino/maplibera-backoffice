import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { CdkDrag, CdkDragDrop, CdkDropList, moveItemInArray } from '@angular/cdk/drag-drop';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatDialog } from '@angular/material/dialog';
import { MatDrawer, MatDrawerContainer, MatDrawerContent } from '@angular/material/sidenav';
import { MatSnackBar } from '@angular/material/snack-bar';
import {
  ORGANIZATION_STATUSES,
  ORGANIZATION_TYPES,
  Organization,
  OrganizationStatus,
  OrganizationType,
} from '../../models/organization.model';
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
import { InfiniteScrollDirective } from '../../../../shared/directives/infinite-scroll.directive';
import { moveDown, moveToTop, moveUp } from '../../../../shared/utils/list-reorder';

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
    InfiniteScrollDirective,
  ],
  templateUrl: './organizations-list.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganizationsListPage {
  private readonly organizationService = inject(OrganizationService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly dialog = inject(MatDialog);
  protected readonly language = inject(LanguageService);

  private readonly PAGE_SIZE = 24;

  protected readonly types = ORGANIZATION_TYPES;
  protected readonly statuses = ORGANIZATION_STATUSES;
  protected readonly activeFilter = signal<OrganizationType | 'all'>('all');
  protected readonly statusFilter = signal<OrganizationStatus | 'all'>('all');

  protected readonly filteredOrganizations = computed<Organization[]>(() => {
    const typeFilter = this.activeFilter();
    const status = this.statusFilter();
    let orgs = this.organizationService.organizations();
    if (typeFilter !== 'all') {
      orgs = orgs.filter((org) => org.type === typeFilter);
    }
    if (status !== 'all') {
      orgs = orgs.filter((org) => org.status === status);
    }
    return orgs;
  });

  protected readonly visibleCount = signal(this.PAGE_SIZE);

  protected readonly visibleOrganizations = computed<Organization[]>(() =>
    this.filteredOrganizations().slice(0, this.visibleCount()),
  );

  protected readonly hasMore = computed(() => this.visibleCount() < this.filteredOrganizations().length);

  protected readonly reorderingEnabled = computed(
    () => this.activeFilter() === 'all' && this.statusFilter() === 'all',
  );

  constructor() {
    effect(() => {
      this.activeFilter();
      this.statusFilter();
      this.visibleCount.set(this.PAGE_SIZE);
    });
  }

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
    const ids = this.organizationService.organizations().map((org) => org.id);
    moveItemInArray(ids, event.previousIndex, event.currentIndex);
    this.organizationService.reorder(ids).catch(() => this.notifyActionFailed());
  }

  protected onMoveToTop(id: string): void {
    const ids = moveToTop(
      this.organizationService.organizations().map((org) => org.id),
      id,
    );
    this.organizationService.reorder(ids).catch(() => this.notifyActionFailed());
  }

  protected onMoveUp(id: string): void {
    const ids = moveUp(
      this.organizationService.organizations().map((org) => org.id),
      id,
    );
    this.organizationService.reorder(ids).catch(() => this.notifyActionFailed());
  }

  protected onMoveDown(id: string): void {
    const ids = moveDown(
      this.organizationService.organizations().map((org) => org.id),
      id,
    );
    this.organizationService.reorder(ids).catch(() => this.notifyActionFailed());
  }

  protected onNearEnd(): void {
    if (this.hasMore()) {
      this.visibleCount.update((n) => n + this.PAGE_SIZE);
    }
  }

  private notifyActionFailed(): void {
    const form = this.language.t().organizations.organizationForm;
    this.snackBar.open(form.actionFailedNotice, form.actionFailedDismiss);
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

  protected statusFilterLabel(status: OrganizationStatus): string {
    const labels = this.language.t().organizations.organizationsList;
    switch (status) {
      case 'draft':
        return labels.statusFilterDraftLabel;
      case 'published':
        return labels.statusFilterPublishedLabel;
      case 'paused':
        return labels.statusFilterPausedLabel;
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

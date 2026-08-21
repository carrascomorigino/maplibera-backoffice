import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CdkDrag, CdkDragDrop, CdkDropList, moveItemInArray } from '@angular/cdk/drag-drop';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatDialog } from '@angular/material/dialog';
import { MatDrawer, MatDrawerContainer, MatDrawerContent } from '@angular/material/sidenav';
import { MatSnackBar } from '@angular/material/snack-bar';
import { RESOURCE_CATEGORIES, Resource, ResourceCategory } from '../../models/resource.model';
import { ContentLanguage } from '../../../guide/models/content-language.model';
import { ResourceService } from '../../services/resource.service';
import { ResourceFormDrawer } from '../../components/resource-form-drawer/resource-form-drawer';
import {
  ResourceCard,
  ResourceEditRequestedEvent,
  ResourceTranslateRequestedEvent,
} from '../../components/resource-card/resource-card';
import { LanguageService } from '../../../../core/i18n/language.service';
import { ConfirmDialog } from '../../../../shared/components/confirm-dialog/confirm-dialog';
import { SelectionToolbar } from '../../../../shared/components/selection-toolbar/selection-toolbar';

type DrawerContext =
  | { mode: 'create'; category: ResourceCategory }
  | {
      mode: 'edit';
      resource: Resource;
      targetLanguage: ContentLanguage;
      staleSourceLanguage?: ContentLanguage;
    }
  | { mode: 'translate'; resource: Resource; targetLanguage: ContentLanguage; sourceLanguage: ContentLanguage };

@Component({
  selector: 'app-resources-list',
  imports: [
    CdkDropList,
    CdkDrag,
    MatButtonModule,
    MatButtonToggleModule,
    MatDrawerContainer,
    MatDrawer,
    MatDrawerContent,
    ResourceFormDrawer,
    ResourceCard,
    SelectionToolbar,
  ],
  templateUrl: './resources-list.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResourcesListPage {
  private readonly resourceService = inject(ResourceService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly dialog = inject(MatDialog);
  protected readonly language = inject(LanguageService);

  protected readonly categories = RESOURCE_CATEGORIES;
  protected readonly resourcesByCategory = this.resourceService.resourcesByCategory;
  protected readonly activeFilter = signal<ResourceCategory | 'all'>('all');
  protected readonly visibleCategories = computed<readonly ResourceCategory[]>(() => {
    const filter = this.activeFilter();
    return filter === 'all' ? this.categories : [filter];
  });

  protected readonly selectedIds = signal<ReadonlySet<string>>(new Set());
  protected readonly selectedCount = computed(() => this.selectedIds().size);

  protected readonly drawerContext = signal<DrawerContext | undefined>(undefined);
  protected readonly isDrawerOpen = computed(() => this.drawerContext() !== undefined);

  protected readonly drawerResource = computed<Resource | undefined>(() => {
    const ctx = this.drawerContext();
    return ctx && ctx.mode !== 'create' ? ctx.resource : undefined;
  });

  protected readonly drawerCategory = computed<ResourceCategory | undefined>(() => {
    const ctx = this.drawerContext();
    if (!ctx) {
      return undefined;
    }
    return ctx.mode === 'create' ? ctx.category : ctx.resource.category;
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

  protected openCreate(category: ResourceCategory): void {
    this.drawerContext.set({ mode: 'create', category });
  }

  protected openEdit(event: ResourceEditRequestedEvent): void {
    this.drawerContext.set({
      mode: 'edit',
      resource: event.resource,
      targetLanguage: event.targetLanguage,
      staleSourceLanguage: event.staleSourceLanguage,
    });
  }

  protected openTranslate(event: ResourceTranslateRequestedEvent): void {
    this.drawerContext.set({
      mode: 'translate',
      resource: event.resource,
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

  onDrop(category: ResourceCategory, event: CdkDragDrop<Resource[]>): void {
    const ids = event.container.data.map((resource) => resource.id);
    moveItemInArray(ids, event.previousIndex, event.currentIndex);
    this.resourceService.reorder(category, ids).catch(() => {
      const form = this.language.t().resources.resourceForm;
      this.snackBar.open(form.actionFailedNotice, form.actionFailedDismiss);
    });
  }

  protected categoryHeading(category: ResourceCategory): string {
    const labels = this.language.t().resources.resourcesList;
    switch (category) {
      case 'nutrition':
        return labels.categoryHeadingNutrition;
      case 'recipes':
        return labels.categoryHeadingRecipes;
      case 'multimedia':
        return labels.categoryHeadingMultimedia;
      case 'apps':
        return labels.categoryHeadingApps;
    }
  }

  protected addButtonLabel(category: ResourceCategory): string {
    const labels = this.language.t().resources.resourcesList;
    switch (category) {
      case 'nutrition':
        return labels.addNutritionButton;
      case 'recipes':
        return labels.addRecipeButton;
      case 'multimedia':
        return labels.addMultimediaButton;
      case 'apps':
        return labels.addAppButton;
    }
  }

  protected filterLabel(category: ResourceCategory): string {
    const labels = this.language.t().resources.resourcesList;
    switch (category) {
      case 'nutrition':
        return labels.filterNutritionLabel;
      case 'recipes':
        return labels.filterRecipesLabel;
      case 'multimedia':
        return labels.filterMultimediaLabel;
      case 'apps':
        return labels.filterAppsLabel;
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
      await Promise.all(ids.map((id) => this.resourceService.delete(id)));
      this.clearSelection();
    } catch {
      const labels = this.language.t().bulkSelection;
      this.snackBar.open(labels.actionFailedNotice, labels.actionFailedDismiss);
    }
  }
}

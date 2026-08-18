import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CdkDrag, CdkDragDrop, CdkDropList, moveItemInArray } from '@angular/cdk/drag-drop';
import { MatButtonModule } from '@angular/material/button';
import { MatDrawer, MatDrawerContainer, MatDrawerContent } from '@angular/material/sidenav';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Section } from '../../models/section.model';
import { ContentLanguage } from '../../models/content-language.model';
import { SectionService } from '../../services/section.service';
import { SectionFormDrawer } from '../../components/section-form-drawer/section-form-drawer';
import {
  EditRequestedEvent,
  ResetSelectionRequest,
  SectionListItem,
  TranslateRequestedEvent,
} from '../../components/section-list-item/section-list-item';
import { LanguageService } from '../../../../core/i18n/language.service';

type DrawerContext =
  | { mode: 'create' }
  | {
      mode: 'edit';
      section: Section;
      targetLanguage: ContentLanguage;
      staleSourceLanguage?: ContentLanguage;
    }
  | { mode: 'translate'; section: Section; targetLanguage: ContentLanguage; sourceLanguage: ContentLanguage };

@Component({
  selector: 'app-sections-list',
  imports: [
    CdkDropList,
    CdkDrag,
    MatButtonModule,
    MatDrawerContainer,
    MatDrawer,
    MatDrawerContent,
    SectionFormDrawer,
    SectionListItem,
  ],
  templateUrl: './sections-list.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SectionsListPage {
  private readonly sectionService = inject(SectionService);
  private readonly snackBar = inject(MatSnackBar);
  protected readonly language = inject(LanguageService);

  protected readonly sections = this.sectionService.sections;
  protected readonly drawerContext = signal<DrawerContext | undefined>(undefined);
  protected readonly isDrawerOpen = computed(() => this.drawerContext() !== undefined);
  protected readonly cancelledSelection = signal<ResetSelectionRequest | undefined>(undefined);

  protected readonly drawerSection = computed<Section | undefined>(() => {
    const ctx = this.drawerContext();
    return ctx && ctx.mode !== 'create' ? ctx.section : undefined;
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

  protected openEdit(event: EditRequestedEvent): void {
    this.drawerContext.set({
      mode: 'edit',
      section: event.section,
      targetLanguage: event.targetLanguage,
      staleSourceLanguage: event.staleSourceLanguage,
    });
  }

  protected openTranslate(event: TranslateRequestedEvent): void {
    this.drawerContext.set({
      mode: 'translate',
      section: event.section,
      targetLanguage: event.targetLanguage,
      sourceLanguage: event.sourceLanguage,
    });
  }

  onSaved(): void {
    this.drawerContext.set(undefined);
  }

  onCancelled(): void {
    const ctx = this.drawerContext();
    if (ctx?.mode === 'translate') {
      this.cancelledSelection.set({ slug: ctx.section.slug, language: ctx.sourceLanguage });
    }
    this.drawerContext.set(undefined);
  }

  onDrop(event: CdkDragDrop<Section[]>): void {
    const ids = event.container.data.map((section) => section.id);
    moveItemInArray(ids, event.previousIndex, event.currentIndex);
    this.sectionService.reorder(ids).catch(() => {
      const labels = this.language.t().guide.sectionForm;
      this.snackBar.open(labels.actionFailedNotice, labels.actionFailedDismiss);
    });
  }
}

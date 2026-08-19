import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CdkDrag, CdkDragDrop, CdkDropList, moveItemInArray } from '@angular/cdk/drag-drop';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatDrawer, MatDrawerContainer, MatDrawerContent } from '@angular/material/sidenav';
import { MatSnackBar } from '@angular/material/snack-bar';
import { PROFESSIONAL_SPECIALTIES, Professional, ProfessionalSpecialty } from '../../models/professional.model';
import { ContentLanguage } from '../../../guide/models/content-language.model';
import { ProfessionalService } from '../../services/professional.service';
import { ProfessionalFormDrawer } from '../../components/professional-form-drawer/professional-form-drawer';
import {
  ProfessionalCard,
  ProfessionalEditRequestedEvent,
  ProfessionalTranslateRequestedEvent,
} from '../../components/professional-card/professional-card';
import { LanguageService } from '../../../../core/i18n/language.service';

type DrawerContext =
  | { mode: 'create'; specialty: ProfessionalSpecialty }
  | {
      mode: 'edit';
      professional: Professional;
      targetLanguage: ContentLanguage;
      staleSourceLanguage?: ContentLanguage;
    }
  | {
      mode: 'translate';
      professional: Professional;
      targetLanguage: ContentLanguage;
      sourceLanguage: ContentLanguage;
    };

@Component({
  selector: 'app-professionals-list',
  imports: [
    CdkDropList,
    CdkDrag,
    MatButtonModule,
    MatButtonToggleModule,
    MatDrawerContainer,
    MatDrawer,
    MatDrawerContent,
    ProfessionalFormDrawer,
    ProfessionalCard,
  ],
  templateUrl: './professionals-list.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfessionalsListPage {
  private readonly professionalService = inject(ProfessionalService);
  private readonly snackBar = inject(MatSnackBar);
  protected readonly language = inject(LanguageService);

  protected readonly specialties = PROFESSIONAL_SPECIALTIES;
  protected readonly professionalsBySpecialty = this.professionalService.professionalsBySpecialty;
  protected readonly activeFilter = signal<ProfessionalSpecialty | 'all'>('all');
  protected readonly visibleSpecialties = computed<readonly ProfessionalSpecialty[]>(() => {
    const filter = this.activeFilter();
    return filter === 'all' ? this.specialties : [filter];
  });

  protected readonly drawerContext = signal<DrawerContext | undefined>(undefined);
  protected readonly isDrawerOpen = computed(() => this.drawerContext() !== undefined);

  protected readonly drawerProfessional = computed<Professional | undefined>(() => {
    const ctx = this.drawerContext();
    return ctx && ctx.mode !== 'create' ? ctx.professional : undefined;
  });

  protected readonly drawerSpecialty = computed<ProfessionalSpecialty | undefined>(() => {
    const ctx = this.drawerContext();
    if (!ctx) {
      return undefined;
    }
    return ctx.mode === 'create' ? ctx.specialty : ctx.professional.specialty;
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

  protected openCreate(specialty: ProfessionalSpecialty): void {
    this.drawerContext.set({ mode: 'create', specialty });
  }

  protected openEdit(event: ProfessionalEditRequestedEvent): void {
    this.drawerContext.set({
      mode: 'edit',
      professional: event.professional,
      targetLanguage: event.targetLanguage,
      staleSourceLanguage: event.staleSourceLanguage,
    });
  }

  protected openTranslate(event: ProfessionalTranslateRequestedEvent): void {
    this.drawerContext.set({
      mode: 'translate',
      professional: event.professional,
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

  onDrop(specialty: ProfessionalSpecialty, event: CdkDragDrop<Professional[]>): void {
    const ids = event.container.data.map((professional) => professional.id);
    moveItemInArray(ids, event.previousIndex, event.currentIndex);
    this.professionalService.reorder(specialty, ids).catch(() => {
      const form = this.language.t().professionals.professionalForm;
      this.snackBar.open(form.actionFailedNotice, form.actionFailedDismiss);
    });
  }

  protected specialtyHeading(specialty: ProfessionalSpecialty): string {
    const labels = this.language.t().professionals.professionalsList;
    switch (specialty) {
      case 'nutritionist':
        return labels.specialtyHeadingNutritionist;
      case 'doctor':
        return labels.specialtyHeadingDoctor;
      case 'dentist':
        return labels.specialtyHeadingDentist;
      case 'coach':
        return labels.specialtyHeadingCoach;
    }
  }

  protected addButtonLabel(specialty: ProfessionalSpecialty): string {
    const labels = this.language.t().professionals.professionalsList;
    switch (specialty) {
      case 'nutritionist':
        return labels.addNutritionistButton;
      case 'doctor':
        return labels.addDoctorButton;
      case 'dentist':
        return labels.addDentistButton;
      case 'coach':
        return labels.addCoachButton;
    }
  }

  protected filterLabel(specialty: ProfessionalSpecialty): string {
    const labels = this.language.t().professionals.professionalsList;
    switch (specialty) {
      case 'nutritionist':
        return labels.filterNutritionistLabel;
      case 'doctor':
        return labels.filterDoctorLabel;
      case 'dentist':
        return labels.filterDentistLabel;
      case 'coach':
        return labels.filterCoachLabel;
    }
  }
}

import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CdkDrag, CdkDragDrop, CdkDropList, moveItemInArray } from '@angular/cdk/drag-drop';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatDrawer, MatDrawerContainer, MatDrawerContent } from '@angular/material/sidenav';
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
  ],
  templateUrl: './organizations-list.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganizationsListPage {
  private readonly organizationService = inject(OrganizationService);
  protected readonly language = inject(LanguageService);

  protected readonly types = ORGANIZATION_TYPES;
  protected readonly activeFilter = signal<OrganizationType | 'all'>('all');
  protected readonly visibleOrganizations = computed<Organization[]>(() => {
    const filter = this.activeFilter();
    const orgs = this.organizationService.organizations();
    return filter === 'all' ? orgs : orgs.filter((org) => org.type === filter);
  });

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
    const slugs = event.container.data.map((org) => org.slug);
    moveItemInArray(slugs, event.previousIndex, event.currentIndex);
    this.organizationService.reorder(slugs);
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
}

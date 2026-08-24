import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SectionService } from '../../../guide/services/section.service';
import { ResourceService } from '../../../resources/services/resource.service';
import { NewsItemService } from '../../../news/services/news-item.service';
import { OrganizationService } from '../../../organizations/services/organization.service';
import { ProfessionalService } from '../../../professionals/services/professional.service';
import { LanguageService } from '../../../../core/i18n/language.service';

type ItemStatus = 'draft' | 'published' | 'paused';

interface DashboardCard {
  key: string;
  label: string;
  total: number;
  published: number;
  draft: number;
  paused: number;
  routerLink: string;
}

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink],
  templateUrl: './dashboard.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardPage {
  private readonly sectionService = inject(SectionService);
  private readonly resourceService = inject(ResourceService);
  private readonly newsItemService = inject(NewsItemService);
  private readonly organizationService = inject(OrganizationService);
  private readonly professionalService = inject(ProfessionalService);
  protected readonly language = inject(LanguageService);

  protected readonly cards = computed<DashboardCard[]>(() => {
    const labels = this.language.t().dashboard;
    return [
      this.toCard('sections', labels.sectionsLabel, this.sectionService.sections(), '/guide/sections'),
      this.toCard('resources', labels.resourcesLabel, this.resourceService.resources(), '/resources'),
      this.toCard('news', labels.newsLabel, this.newsItemService.items(), '/news'),
      this.toCard(
        'organizations',
        labels.organizationsLabel,
        this.organizationService.organizations(),
        '/organizations',
      ),
      this.toCard(
        'professionals',
        labels.professionalsLabel,
        this.professionalService.professionals(),
        '/professionals',
      ),
    ];
  });

  private toCard(
    key: string,
    label: string,
    items: { status: ItemStatus }[],
    routerLink: string,
  ): DashboardCard {
    return {
      key,
      label,
      total: items.length,
      published: items.filter((item) => item.status === 'published').length,
      draft: items.filter((item) => item.status === 'draft').length,
      paused: items.filter((item) => item.status === 'paused').length,
      routerLink,
    };
  }
}

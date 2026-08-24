import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { DashboardPage } from './dashboard.page';
import { SectionService } from '../../../guide/services/section.service';
import { ResourceService } from '../../../resources/services/resource.service';
import { NewsItemService } from '../../../news/services/news-item.service';
import { OrganizationService } from '../../../organizations/services/organization.service';
import { ProfessionalService } from '../../../professionals/services/professional.service';
import { LanguageService } from '../../../../core/i18n/language.service';
import { FakeSectionService, makeSection } from '../../../guide/testing/fake-section-service';
import { FakeResourceService, makeResource } from '../../../resources/testing/fake-resource-service';
import { FakeNewsItemService, makeNewsItem } from '../../../news/testing/fake-news-item-service';
import { FakeOrganizationService, makeOrganization } from '../../../organizations/testing/fake-organization-service';
import { FakeProfessionalService, makeProfessional } from '../../../professionals/testing/fake-professional-service';

describe('DashboardPage', () => {
  let sectionService: FakeSectionService;
  let resourceService: FakeResourceService;
  let newsItemService: FakeNewsItemService;
  let organizationService: FakeOrganizationService;
  let professionalService: FakeProfessionalService;
  let language: LanguageService;

  beforeEach(() => {
    sectionService = new FakeSectionService();
    resourceService = new FakeResourceService();
    newsItemService = new FakeNewsItemService();
    organizationService = new FakeOrganizationService();
    professionalService = new FakeProfessionalService();

    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: SectionService, useValue: sectionService },
        { provide: ResourceService, useValue: resourceService },
        { provide: NewsItemService, useValue: newsItemService },
        { provide: OrganizationService, useValue: organizationService },
        { provide: ProfessionalService, useValue: professionalService },
      ],
    });
    language = TestBed.inject(LanguageService);
  });

  function createFixture() {
    const fixture = TestBed.createComponent(DashboardPage);
    fixture.detectChanges();
    return fixture;
  }

  it('shows the total and status breakdown for each module', () => {
    sectionService.seed([
      makeSection({ status: 'published' }),
      makeSection({ status: 'draft' }),
      makeSection({ status: 'paused' }),
    ]);

    const fixture = createFixture();
    const card = fixture.nativeElement.querySelector('[data-testid="dashboard-card-sections"]') as HTMLElement;

    expect(card.textContent).toContain(language.t().dashboard.sectionsLabel);
    expect(card.querySelector('[data-testid="count-total"]')?.textContent?.trim()).toBe('3');
    expect(card.querySelector('[data-testid="count-published"]')?.textContent?.trim()).toBe('1');
    expect(card.querySelector('[data-testid="count-draft"]')?.textContent?.trim()).toBe('1');
    expect(card.querySelector('[data-testid="count-paused"]')?.textContent?.trim()).toBe('1');
  });

  it('shows zero counts when a module has no items yet', () => {
    const fixture = createFixture();
    const card = fixture.nativeElement.querySelector('[data-testid="dashboard-card-news"]') as HTMLElement;

    expect(card.querySelector('[data-testid="count-total"]')?.textContent?.trim()).toBe('0');
  });

  it('renders one card per module, each linking to its list page', () => {
    const fixture = createFixture();
    const compiled = fixture.nativeElement as HTMLElement;

    const expectedLinks: Record<string, string> = {
      sections: '/guide/sections',
      resources: '/resources',
      news: '/news',
      organizations: '/organizations',
      professionals: '/professionals',
    };

    for (const [key, href] of Object.entries(expectedLinks)) {
      const card = compiled.querySelector(`[data-testid="dashboard-card-${key}"]`);
      expect(card?.getAttribute('href')).toBe(href);
    }
  });

  it('reflects counts from resources, news, organizations, and professionals', () => {
    resourceService.seed([makeResource({ status: 'published' }), makeResource({ status: 'draft' })]);
    newsItemService.seed([makeNewsItem({ status: 'published' })]);
    organizationService.seed([
      makeOrganization({ status: 'paused' }),
      makeOrganization({ status: 'paused' }),
    ]);
    professionalService.seed([makeProfessional({ status: 'draft' })]);

    const fixture = createFixture();
    const compiled = fixture.nativeElement as HTMLElement;

    const totalFor = (key: string) =>
      compiled
        .querySelector(`[data-testid="dashboard-card-${key}"] [data-testid="count-total"]`)
        ?.textContent?.trim();

    expect(totalFor('resources')).toBe('2');
    expect(totalFor('news')).toBe('1');
    expect(totalFor('organizations')).toBe('2');
    expect(totalFor('professionals')).toBe('1');
  });
});

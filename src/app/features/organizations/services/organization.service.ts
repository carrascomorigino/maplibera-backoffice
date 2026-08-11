import { Injectable, computed, signal } from '@angular/core';
import {
  Organization,
  OrganizationContactLinks,
  OrganizationScopeType,
  OrganizationTranslation,
  OrganizationType,
  ORGANIZATION_TYPES,
} from '../models/organization.model';
import { ContentLanguage } from '../../guide/models/content-language.model';

const STORAGE_KEY = 'app-organizations';

function translationsEqual(a: OrganizationTranslation, b: OrganizationTranslation): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export interface OrganizationSharedFields {
  logoUrl: string;
  scopeType: OrganizationScopeType;
  countryCode?: string;
  city?: string;
  contactLinks: OrganizationContactLinks;
}

export interface OrganizationCreateInput {
  type: OrganizationType;
  slug: string;
  sharedFields: OrganizationSharedFields;
  language: ContentLanguage;
  translation: OrganizationTranslation;
}

@Injectable({ providedIn: 'root' })
export class OrganizationService {
  private readonly state = signal<Organization[]>(this.loadFromStorage());

  readonly organizations = computed(() => [...this.state()].sort((a, b) => a.order - b.order));

  create(input: OrganizationCreateInput): Organization {
    const now = new Date().toISOString();
    const org: Organization = {
      slug: input.slug,
      type: input.type,
      status: 'draft',
      order: this.state().length,
      logoUrl: input.sharedFields.logoUrl,
      scopeType: input.sharedFields.scopeType,
      countryCode: input.sharedFields.countryCode,
      city: input.sharedFields.city,
      contactLinks: input.sharedFields.contactLinks,
      translations: { [input.language]: input.translation },
      createdAt: now,
      updatedAt: now,
    };

    this.state.update((orgs) => [...orgs, org]);
    this.persist();
    return org;
  }

  saveTranslation(
    slug: string,
    language: ContentLanguage,
    translation: OrganizationTranslation,
    newSlug?: string,
  ): void {
    this.state.update((orgs) =>
      orgs.map((org) => {
        if (org.slug !== slug) {
          return org;
        }

        const previousTranslation = org.translations[language];
        const contentChanged = !previousTranslation || !translationsEqual(previousTranslation, translation);
        const translations = { ...org.translations, [language]: translation };
        const staleLanguages = { ...org.staleLanguages };
        delete staleLanguages[language];
        if (previousTranslation && contentChanged) {
          for (const lang of Object.keys(translations) as ContentLanguage[]) {
            if (lang !== language) {
              staleLanguages[lang] = language;
            }
          }
        }

        return {
          ...org,
          slug: newSlug ?? org.slug,
          translations,
          staleLanguages,
          updatedAt: new Date().toISOString(),
        };
      }),
    );
    this.persist();
  }

  removeTranslation(slug: string, language: ContentLanguage): void {
    this.state.update((orgs) =>
      orgs.map((org) => {
        if (org.slug !== slug || Object.keys(org.translations).length <= 1) {
          return org;
        }

        const translations = { ...org.translations };
        delete translations[language];

        const staleLanguages = { ...org.staleLanguages };
        delete staleLanguages[language];
        for (const lang of Object.keys(staleLanguages) as ContentLanguage[]) {
          if (staleLanguages[lang] === language) {
            delete staleLanguages[lang];
          }
        }

        return {
          ...org,
          translations,
          staleLanguages,
          updatedAt: new Date().toISOString(),
        };
      }),
    );
    this.persist();
  }

  updateSharedFields(slug: string, sharedFields: OrganizationSharedFields): void {
    this.state.update((orgs) =>
      orgs.map((org) =>
        org.slug === slug
          ? {
              ...org,
              logoUrl: sharedFields.logoUrl,
              scopeType: sharedFields.scopeType,
              countryCode: sharedFields.countryCode,
              city: sharedFields.city,
              contactLinks: sharedFields.contactLinks,
              updatedAt: new Date().toISOString(),
            }
          : org,
      ),
    );
    this.persist();
  }

  reorder(orderedSlugs: string[]): void {
    const orderBySlug = new Map(orderedSlugs.map((slug, index) => [slug, index]));
    this.state.update((orgs) =>
      orgs.map((org) => ({
        ...org,
        order: orderBySlug.get(org.slug) ?? org.order,
      })),
    );
    this.persist();
  }

  publish(slug: string): void {
    this.setStatus(slug, 'published');
  }

  pause(slug: string): void {
    this.setStatus(slug, 'paused');
  }

  private setStatus(slug: string, status: Organization['status']): void {
    this.state.update((orgs) =>
      orgs.map((org) => (org.slug === slug ? { ...org, status, updatedAt: new Date().toISOString() } : org)),
    );
    this.persist();
  }

  private persist(): void {
    if (typeof localStorage === 'undefined') {
      return;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state()));
  }

  private loadFromStorage(): Organization[] {
    if (typeof localStorage === 'undefined') {
      return [];
    }
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    try {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        return [];
      }
      return parsed.filter(
        (org): org is Organization =>
          typeof org?.slug === 'string' &&
          org.slug.length > 0 &&
          ORGANIZATION_TYPES.includes(org.type) &&
          typeof org?.translations === 'object' &&
          org.translations !== null &&
          Object.keys(org.translations).length > 0,
      );
    } catch {
      return [];
    }
  }
}

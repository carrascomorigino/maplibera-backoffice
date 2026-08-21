import { ContentLanguage } from '../../guide/models/content-language.model';

export type OrganizationType = 'local-group' | 'ngo' | 'social-network' | 'campaign';
export type OrganizationStatus = 'draft' | 'published' | 'paused';
export type OrganizationScopeType = 'global' | 'country' | 'city';

export interface OrganizationContactLinks {
  website?: string;
  instagram?: string;
  telegram?: string;
  whatsapp?: string;
  volunteerFormUrl?: string;
}

export interface OrganizationTranslation {
  name: string;
  description: string;
}

export interface Organization {
  /** Stable backend identifier — unlike slug, this never changes on rename. */
  id: string;
  slug: string;
  type: OrganizationType;
  status: OrganizationStatus;
  order: number;
  /** Absent on documents saved before the multi-image gallery was introduced. */
  images?: { url: string; description?: string }[];
  videoUrl?: string;
  scopeType: OrganizationScopeType;
  /** ISO 3166-1 alpha-2 code. Only meaningful when scopeType === 'country'. */
  countryCode?: string;
  /** Free text. Only meaningful when scopeType === 'city'. */
  city?: string;
  contactLinks: OrganizationContactLinks;
  createdAt: string;
  updatedAt: string;
  translations: Partial<Record<ContentLanguage, OrganizationTranslation>>;
  /** Maps a language that needs re-syncing to the language it should translate from. */
  staleLanguages?: Partial<Record<ContentLanguage, ContentLanguage>>;
}

export const ORGANIZATION_TYPES: readonly OrganizationType[] = [
  'local-group',
  'ngo',
  'social-network',
  'campaign',
];

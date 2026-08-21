import { ContentLanguage } from '../../guide/models/content-language.model';

export type ProfessionalSpecialty = 'nutritionist' | 'doctor' | 'dentist' | 'coach';
export type ProfessionalStatus = 'draft' | 'published' | 'paused';
export type ProfessionalScopeType = 'global' | 'country' | 'city';

export interface ProfessionalContactLinks {
  website?: string;
  instagram?: string;
  telegram?: string;
  whatsapp?: string;
  bookingUrl?: string;
}

export interface ProfessionalTranslation {
  name: string;
  credentialsTitle: string;
  bio: string;
}

interface ProfessionalBase {
  /** Stable backend identifier — unlike slug, this never changes on rename. */
  id: string;
  slug: string;
  specialty: ProfessionalSpecialty;
  status: ProfessionalStatus;
  order: number;
  /** Absent on documents saved before the multi-image gallery was introduced. */
  images?: { url: string; description?: string }[];
  videoUrl?: string;
  scopeType: ProfessionalScopeType;
  /** ISO 3166-1 alpha-2 code. Only meaningful when scopeType === 'country'. */
  countryCode?: string;
  /** Free text. Only meaningful when scopeType === 'city'. */
  city?: string;
  contactLinks: ProfessionalContactLinks;
  createdAt: string;
  updatedAt: string;
  /** Maps a language that needs re-syncing to the language it should translate from. */
  staleLanguages?: Partial<Record<ContentLanguage, ContentLanguage>>;
}

export interface NutritionistProfessional extends ProfessionalBase {
  specialty: 'nutritionist';
  licenseNumber: string;
  dietarySpecialties: string[];
  translations: Partial<Record<ContentLanguage, ProfessionalTranslation>>;
}

export interface DoctorProfessional extends ProfessionalBase {
  specialty: 'doctor';
  medicalLicenseNumber: string;
  medicalSpecialty: string;
  translations: Partial<Record<ContentLanguage, ProfessionalTranslation>>;
}

export interface DentistProfessional extends ProfessionalBase {
  specialty: 'dentist';
  licenseNumber: string;
  acceptsChildren: boolean;
  translations: Partial<Record<ContentLanguage, ProfessionalTranslation>>;
}

export interface CoachProfessional extends ProfessionalBase {
  specialty: 'coach';
  certifications: string[];
  coachingAreas: string[];
  translations: Partial<Record<ContentLanguage, ProfessionalTranslation>>;
}

export type Professional =
  | NutritionistProfessional
  | DoctorProfessional
  | DentistProfessional
  | CoachProfessional;

export const PROFESSIONAL_SPECIALTIES: readonly ProfessionalSpecialty[] = [
  'nutritionist',
  'doctor',
  'dentist',
  'coach',
];

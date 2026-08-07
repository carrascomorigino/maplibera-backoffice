import { ContentLanguage } from '../../guide/models/content-language.model';

export type ResourceCategory = 'nutrition' | 'recipes' | 'multimedia' | 'apps';
export type ResourceStatus = 'draft' | 'published' | 'paused';
export type MultimediaType = 'documentary' | 'book' | 'podcast';

interface ResourceBase {
  slug: string;
  category: ResourceCategory;
  status: ResourceStatus;
  order: number;
  createdAt: string;
  updatedAt: string;
  staleLanguages?: Partial<Record<ContentLanguage, ContentLanguage>>;
}

export interface NutritionTranslation {
  title: string;
  shortDescription: string;
  explanatoryText: string;
}

export interface NutritionResource extends ResourceBase {
  category: 'nutrition';
  sourceLinks: string[];
  pdfUrls: string[];
  translations: Partial<Record<ContentLanguage, NutritionTranslation>>;
}

export interface RecipeTranslation {
  title: string;
  shortDescription: string;
  ingredients: string[];
  steps: string[];
}

export interface RecipeResource extends ResourceBase {
  category: 'recipes';
  preparationMinutes: number;
  photoUrls: string[];
  translations: Partial<Record<ContentLanguage, RecipeTranslation>>;
}

export interface MultimediaTranslation {
  title: string;
  shortDescription: string;
}

export interface MultimediaResource extends ResourceBase {
  category: 'multimedia';
  mediaType: MultimediaType;
  externalUrl: string;
  posterUrl: string;
  translations: Partial<Record<ContentLanguage, MultimediaTranslation>>;
}

export interface AppTranslation {
  title: string;
  shortDescription: string;
}

export interface AppResource extends ResourceBase {
  category: 'apps';
  appStoreUrl?: string;
  playStoreUrl?: string;
  iconUrl: string;
  translations: Partial<Record<ContentLanguage, AppTranslation>>;
}

export type Resource = NutritionResource | RecipeResource | MultimediaResource | AppResource;

export type ResourceTranslation =
  | NutritionTranslation
  | RecipeTranslation
  | MultimediaTranslation
  | AppTranslation;

export const RESOURCE_CATEGORIES: readonly ResourceCategory[] = [
  'nutrition',
  'recipes',
  'multimedia',
  'apps',
];

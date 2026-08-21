import { ContentLanguage } from '../../guide/models/content-language.model';

export type NewsCategory = 'news' | 'event';
export type NewsStatus = 'draft' | 'published' | 'paused';

export interface NewsTranslation {
  title: string;
  subtitle: string;
  description: string;
}

export interface NewsItem {
  /** Stable backend identifier — unlike slug, this never changes on rename. */
  id: string;
  slug: string;
  category: NewsCategory;
  status: NewsStatus;
  /** Absent on documents saved before the multi-image gallery was introduced. */
  images?: { url: string; description?: string }[];
  videoUrl?: string;
  publishedAt: string;
  eventDate?: string;
  sourceLinks: string[];
  createdAt: string;
  updatedAt: string;
  translations: Partial<Record<ContentLanguage, NewsTranslation>>;
  /** Maps a language that needs re-syncing to the language it should translate from. */
  staleLanguages?: Partial<Record<ContentLanguage, ContentLanguage>>;
}

export const NEWS_CATEGORIES: readonly NewsCategory[] = ['news', 'event'];

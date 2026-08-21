import { ContentLanguage } from './content-language.model';

export type SectionStatus = 'draft' | 'published' | 'paused';

export type QuestionType = 'yes-no' | 'single' | 'multiple';

export interface QuestionAnswer {
  text: string;
  isCorrect: boolean;
  imageUrl?: string;
  imageData?: string;
}

export interface Question {
  text: string;
  type: QuestionType;
  detail?: string;
  yesNoCorrectAnswer?: 'yes' | 'no';
  answers?: QuestionAnswer[];
  includeAllOfTheAbove?: boolean;
  allOfTheAboveCorrect?: boolean;
  includeNoneOfTheAbove?: boolean;
  noneOfTheAboveCorrect?: boolean;
}

export interface SectionTranslation {
  title: string;
  description: string;
  question?: Question;
}

export interface Section {
  /** Stable backend identifier — unlike slug, this never changes on rename. */
  id: string;
  slug: string;
  /** Absent on documents saved before the multi-image gallery was introduced. */
  images?: { url: string; description?: string }[];
  videoUrl?: string;
  status: SectionStatus;
  order: number;
  createdAt: string;
  updatedAt: string;
  translations: Partial<Record<ContentLanguage, SectionTranslation>>;
  /** Maps a language that needs re-syncing to the language it should translate from. */
  staleLanguages?: Partial<Record<ContentLanguage, ContentLanguage>>;
  /** ISO 3166-1 alpha-2 codes. Omitted/undefined means available in all countries. */
  availableCountries?: string[];
}

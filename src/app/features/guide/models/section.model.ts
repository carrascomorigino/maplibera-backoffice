export type SectionStatus = 'draft' | 'published' | 'paused';

export type QuestionType = 'yes-no' | 'single' | 'multiple';

export interface QuestionAnswer {
  text: string;
  isCorrect: boolean;
  imageUrl?: string;
}

export interface Question {
  text: string;
  type: QuestionType;
  yesNoCorrectAnswer?: 'yes' | 'no';
  answers?: QuestionAnswer[];
  includeAllOfTheAbove?: boolean;
  allOfTheAboveCorrect?: boolean;
  includeNoneOfTheAbove?: boolean;
  noneOfTheAboveCorrect?: boolean;
}

export interface Section {
  slug: string;
  title: string;
  description: string;
  imageUrl: string;
  status: SectionStatus;
  order: number;
  createdAt: string;
  updatedAt: string;
  question?: Question;
}

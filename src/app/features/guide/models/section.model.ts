export type SectionStatus = 'draft' | 'published' | 'paused';

export interface Section {
  slug: string;
  title: string;
  description: string;
  imageUrl: string;
  status: SectionStatus;
  order: number;
  createdAt: string;
  updatedAt: string;
}

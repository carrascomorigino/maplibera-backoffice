export type SectionStatus = 'draft' | 'published' | 'paused';

export interface Section {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  status: SectionStatus;
  order: number;
  createdAt: string;
  updatedAt: string;
}

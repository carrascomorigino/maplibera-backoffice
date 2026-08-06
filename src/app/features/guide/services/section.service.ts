import { Injectable, computed, signal } from '@angular/core';
import { Section } from '../models/section.model';

const STORAGE_KEY = 'guide-sections';

export type SectionInput = Pick<
  Section,
  'slug' | 'title' | 'description' | 'imageUrl' | 'question'
>;
export type SectionUpdate = Partial<SectionInput>;

@Injectable({ providedIn: 'root' })
export class SectionService {
  private readonly state = signal<Section[]>(this.loadFromStorage());

  readonly sections = computed(() =>
    [...this.state()].sort((a, b) => a.order - b.order),
  );

  create(input: SectionInput): Section {
    const now = new Date().toISOString();
    const section: Section = {
      slug: input.slug,
      title: input.title,
      description: input.description,
      imageUrl: input.imageUrl,
      question: input.question,
      status: 'draft',
      order: this.state().length,
      createdAt: now,
      updatedAt: now,
    };

    this.state.update((sections) => [...sections, section]);
    this.persist();
    return section;
  }

  update(slug: string, changes: SectionUpdate): void {
    this.state.update((sections) =>
      sections.map((section) =>
        section.slug === slug
          ? { ...section, ...changes, updatedAt: new Date().toISOString() }
          : section,
      ),
    );
    this.persist();
  }

  publish(slug: string): void {
    this.setStatus(slug, 'published');
  }

  pause(slug: string): void {
    this.setStatus(slug, 'paused');
  }

  reorder(orderedSlugs: string[]): void {
    const orderBySlug = new Map(orderedSlugs.map((slug, index) => [slug, index]));
    this.state.update((sections) =>
      sections.map((section) => ({
        ...section,
        order: orderBySlug.get(section.slug) ?? section.order,
      })),
    );
    this.persist();
  }

  private setStatus(slug: string, status: Section['status']): void {
    this.state.update((sections) =>
      sections.map((section) =>
        section.slug === slug
          ? { ...section, status, updatedAt: new Date().toISOString() }
          : section,
      ),
    );
    this.persist();
  }

  private persist(): void {
    if (typeof localStorage === 'undefined') {
      return;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state()));
  }

  private loadFromStorage(): Section[] {
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
        (section): section is Section =>
          typeof section?.slug === 'string' && section.slug.length > 0,
      );
    } catch {
      return [];
    }
  }
}

import { Injectable, computed, signal } from '@angular/core';
import { Section } from '../models/section.model';

const STORAGE_KEY = 'guide-sections';

export type SectionInput = Pick<Section, 'title' | 'description' | 'imageUrl'>;
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
      id: crypto.randomUUID(),
      title: input.title,
      description: input.description,
      imageUrl: input.imageUrl,
      status: 'draft',
      order: this.state().length,
      createdAt: now,
      updatedAt: now,
    };

    this.state.update((sections) => [...sections, section]);
    this.persist();
    return section;
  }

  update(id: string, changes: SectionUpdate): void {
    this.state.update((sections) =>
      sections.map((section) =>
        section.id === id
          ? { ...section, ...changes, updatedAt: new Date().toISOString() }
          : section,
      ),
    );
    this.persist();
  }

  publish(id: string): void {
    this.setStatus(id, 'published');
  }

  pause(id: string): void {
    this.setStatus(id, 'paused');
  }

  reorder(orderedIds: string[]): void {
    const orderById = new Map(orderedIds.map((id, index) => [id, index]));
    this.state.update((sections) =>
      sections.map((section) => ({
        ...section,
        order: orderById.get(section.id) ?? section.order,
      })),
    );
    this.persist();
  }

  private setStatus(id: string, status: Section['status']): void {
    this.state.update((sections) =>
      sections.map((section) =>
        section.id === id
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
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
}

import { computed, signal } from '@angular/core';
import {
  PROFESSIONAL_SPECIALTIES,
  Professional,
  ProfessionalSpecialty,
  ProfessionalStatus,
} from '../models/professional.model';
import { ContentLanguage } from '../../guide/models/content-language.model';
import { ProfessionalCreateInput } from '../services/professional.service';

let nextId = 0;

export function makeProfessional(overrides: Partial<Professional> = {}): Professional {
  const base = {
    id: `id-${++nextId}`,
    slug: 'professional',
    specialty: 'nutritionist' as const,
    status: 'draft' as const,
    order: 0,
    photoUrl: 'https://example.com/photo.png',
    scopeType: 'global' as const,
    contactLinks: {},
    licenseNumber: 'AB123',
    dietarySpecialties: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    translations: { en: { name: 'Professional', credentialsTitle: '', bio: '' } },
  };
  return { ...base, ...overrides } as Professional;
}

/** Component-level test double for ProfessionalService — see FakeSectionService for rationale. */
export class FakeProfessionalService {
  private readonly _professionals = signal<Professional[]>([]);
  private readonly specialtyOrder = new Map(
    PROFESSIONAL_SPECIALTIES.map((specialty, index) => [specialty, index]),
  );

  readonly professionals = computed(() =>
    [...this._professionals()].sort((a, b) => {
      const specialtyDiff =
        (this.specialtyOrder.get(a.specialty) ?? 0) - (this.specialtyOrder.get(b.specialty) ?? 0);
      return specialtyDiff !== 0 ? specialtyDiff : a.order - b.order;
    }),
  );

  readonly professionalsBySpecialty = computed<Record<ProfessionalSpecialty, Professional[]>>(() => {
    const groups: Record<ProfessionalSpecialty, Professional[]> = {
      nutritionist: [],
      doctor: [],
      dentist: [],
      coach: [],
    };
    for (const professional of this.professionals()) {
      groups[professional.specialty].push(professional);
    }
    return groups;
  });

  seed(professionals: Professional[]): void {
    this._professionals.set(professionals);
  }

  create = vi.fn(async (input: ProfessionalCreateInput): Promise<Professional> => {
    const order = this._professionals().filter((p) => p.specialty === input.specialty).length;
    const professional = makeProfessional({
      slug: input.slug,
      specialty: input.specialty,
      order,
      translations: { [input.language]: input.translation },
      ...input.sharedFields,
    } as Partial<Professional>);
    this._professionals.update((professionals) => [...professionals, professional]);
    return professional;
  });

  saveTranslation = vi.fn(
    async (
      id: string,
      language: ContentLanguage,
      translation: Professional['translations'][ContentLanguage],
      newSlug?: string,
    ): Promise<Professional> => {
      const current = this._professionals().find((p) => p.id === id);
      if (!current) {
        throw new Error(`Unknown professional id: ${id}`);
      }
      const updated = {
        ...current,
        slug: newSlug ?? current.slug,
        translations: { ...current.translations, [language]: translation },
        updatedAt: new Date().toISOString(),
      } as Professional;
      this.replace(updated);
      return updated;
    },
  );

  removeTranslation = vi.fn(async (id: string, language: ContentLanguage): Promise<Professional> => {
    const current = this._professionals().find((p) => p.id === id);
    if (!current) {
      throw new Error(`Unknown professional id: ${id}`);
    }
    const translations = { ...current.translations };
    delete translations[language];
    const updated = { ...current, translations, updatedAt: new Date().toISOString() } as Professional;
    this.replace(updated);
    return updated;
  });

  updateSharedFields = vi.fn(
    async (id: string, sharedFields: Record<string, unknown>): Promise<Professional> => {
      const current = this._professionals().find((p) => p.id === id);
      if (!current) {
        throw new Error(`Unknown professional id: ${id}`);
      }
      const updated = { ...current, ...sharedFields, updatedAt: new Date().toISOString() } as Professional;
      this.replace(updated);
      return updated;
    },
  );

  reorder = vi.fn(async (specialty: ProfessionalSpecialty, orderedIds: string[]): Promise<void> => {
    const orderById = new Map(orderedIds.map((id, index) => [id, index]));
    this._professionals.update((professionals) =>
      professionals.map((professional) =>
        professional.specialty === specialty
          ? { ...professional, order: orderById.get(professional.id) ?? professional.order }
          : professional,
      ),
    );
  });

  publish = vi.fn((id: string): Promise<Professional> => this.setStatus(id, 'published'));
  pause = vi.fn((id: string): Promise<Professional> => this.setStatus(id, 'paused'));

  private async setStatus(id: string, status: ProfessionalStatus): Promise<Professional> {
    const current = this._professionals().find((p) => p.id === id);
    if (!current) {
      throw new Error(`Unknown professional id: ${id}`);
    }
    const updated = { ...current, status, updatedAt: new Date().toISOString() } as Professional;
    this.replace(updated);
    return updated;
  }

  private replace(updated: Professional): void {
    this._professionals.update((professionals) =>
      professionals.map((p) => (p.id === updated.id ? updated : p)),
    );
  }
}

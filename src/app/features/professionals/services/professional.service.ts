import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import {
  PROFESSIONAL_SPECIALTIES,
  Professional,
  ProfessionalContactLinks,
  ProfessionalScopeType,
  ProfessionalSpecialty,
  ProfessionalStatus,
  ProfessionalTranslation,
} from '../models/professional.model';
import { ContentLanguage } from '../../guide/models/content-language.model';

const BASE_URL = '/backend/professionals';

interface ProfessionalSharedFieldsBase {
  images: { url?: string; data?: string; description?: string }[];
  videoUrl?: string;
  scopeType: ProfessionalScopeType;
  countryCode?: string;
  city?: string;
  contactLinks: ProfessionalContactLinks;
}

export type ProfessionalCreateInput =
  | {
      specialty: 'nutritionist';
      slug: string;
      sharedFields: ProfessionalSharedFieldsBase & {
        licenseNumber: string;
        dietarySpecialties: string[];
      };
      language: ContentLanguage;
      translation: ProfessionalTranslation;
    }
  | {
      specialty: 'doctor';
      slug: string;
      sharedFields: ProfessionalSharedFieldsBase & {
        medicalLicenseNumber: string;
        medicalSpecialty: string;
      };
      language: ContentLanguage;
      translation: ProfessionalTranslation;
    }
  | {
      specialty: 'dentist';
      slug: string;
      sharedFields: ProfessionalSharedFieldsBase & {
        licenseNumber: string;
        acceptsChildren: boolean;
      };
      language: ContentLanguage;
      translation: ProfessionalTranslation;
    }
  | {
      specialty: 'coach';
      slug: string;
      sharedFields: ProfessionalSharedFieldsBase & {
        certifications: string[];
        coachingAreas: string[];
      };
      language: ContentLanguage;
      translation: ProfessionalTranslation;
    };

@Injectable({ providedIn: 'root' })
export class ProfessionalService {
  private readonly http = inject(HttpClient);

  private readonly state = signal<Professional[]>([]);

  private readonly specialtyOrder = new Map(
    PROFESSIONAL_SPECIALTIES.map((specialty, index) => [specialty, index]),
  );

  readonly professionals = computed(() =>
    [...this.state()].sort((a, b) => {
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

  constructor() {
    void this.refresh();
  }

  async refresh(): Promise<void> {
    const professionals = await firstValueFrom(this.http.get<Professional[]>(BASE_URL));
    this.state.set(professionals);
  }

  async create(input: ProfessionalCreateInput): Promise<Professional> {
    const professional = await firstValueFrom(this.http.post<Professional>(BASE_URL, input));
    this.state.update((professionals) => [...professionals, professional]);
    return professional;
  }

  async saveTranslation(
    id: string,
    language: ContentLanguage,
    translation: ProfessionalTranslation,
    newSlug?: string,
  ): Promise<Professional> {
    const updated = await firstValueFrom(
      this.http.put<Professional>(`${BASE_URL}/${id}/translations`, { language, translation, newSlug }),
    );
    this.replace(updated);
    return updated;
  }

  async removeTranslation(id: string, language: ContentLanguage): Promise<Professional> {
    const updated = await firstValueFrom(
      this.http.delete<Professional>(`${BASE_URL}/${id}/translations/${language}`),
    );
    this.replace(updated);
    return updated;
  }

  async updateSharedFields(id: string, sharedFields: Record<string, unknown>): Promise<Professional> {
    const updated = await firstValueFrom(
      this.http.patch<Professional>(`${BASE_URL}/${id}/shared-fields`, { sharedFields }),
    );
    this.replace(updated);
    return updated;
  }

  async reorder(specialty: ProfessionalSpecialty, orderedIds: string[]): Promise<void> {
    await firstValueFrom(this.http.post(`${BASE_URL}/reorder`, { specialty, orderedIds }));
    const orderById = new Map(orderedIds.map((id, index) => [id, index]));
    this.state.update((professionals) =>
      professionals.map((professional) =>
        professional.specialty === specialty
          ? { ...professional, order: orderById.get(professional.id) ?? professional.order }
          : professional,
      ),
    );
  }

  async publish(id: string): Promise<Professional> {
    return this.setStatus(id, 'published');
  }

  async pause(id: string): Promise<Professional> {
    return this.setStatus(id, 'paused');
  }

  private async setStatus(id: string, status: ProfessionalStatus): Promise<Professional> {
    const action = status === 'published' ? 'publish' : 'pause';
    const updated = await firstValueFrom(this.http.post<Professional>(`${BASE_URL}/${id}/${action}`, {}));
    this.replace(updated);
    return updated;
  }

  private replace(updated: Professional): void {
    this.state.update((professionals) =>
      professionals.map((professional) => (professional.id === updated.id ? updated : professional)),
    );
  }
}

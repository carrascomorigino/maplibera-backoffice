import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import {
  Organization,
  OrganizationContactLinks,
  OrganizationScopeType,
  OrganizationStatus,
  OrganizationTranslation,
  OrganizationType,
} from '../models/organization.model';
import { ContentLanguage } from '../../guide/models/content-language.model';

const BASE_URL = '/backend/organizations';

export interface OrganizationSharedFields {
  images?: { url?: string; data?: string; description?: string }[];
  videoUrl?: string;
  scopeType: OrganizationScopeType;
  countryCode?: string;
  city?: string;
  contactLinks: OrganizationContactLinks;
}

export interface OrganizationCreateInput {
  type: OrganizationType;
  slug: string;
  sharedFields: OrganizationSharedFields;
  language: ContentLanguage;
  translation: OrganizationTranslation;
}

@Injectable({ providedIn: 'root' })
export class OrganizationService {
  private readonly http = inject(HttpClient);

  private readonly state = signal<Organization[]>([]);

  readonly organizations = computed(() => [...this.state()].sort((a, b) => a.order - b.order));

  constructor() {
    void this.refresh();
  }

  async refresh(): Promise<void> {
    const orgs = await firstValueFrom(this.http.get<Organization[]>(BASE_URL));
    this.state.set(orgs);
  }

  async create(input: OrganizationCreateInput): Promise<Organization> {
    const org = await firstValueFrom(this.http.post<Organization>(BASE_URL, input));
    this.state.update((orgs) => [...orgs, org]);
    return org;
  }

  async saveTranslation(
    id: string,
    language: ContentLanguage,
    translation: OrganizationTranslation,
    newSlug?: string,
  ): Promise<Organization> {
    const updated = await firstValueFrom(
      this.http.put<Organization>(`${BASE_URL}/${id}/translations`, { language, translation, newSlug }),
    );
    this.replace(updated);
    return updated;
  }

  async removeTranslation(id: string, language: ContentLanguage): Promise<Organization> {
    const updated = await firstValueFrom(
      this.http.delete<Organization>(`${BASE_URL}/${id}/translations/${language}`),
    );
    this.replace(updated);
    return updated;
  }

  async updateSharedFields(id: string, sharedFields: OrganizationSharedFields): Promise<Organization> {
    const updated = await firstValueFrom(
      this.http.patch<Organization>(`${BASE_URL}/${id}/shared-fields`, { sharedFields }),
    );
    this.replace(updated);
    return updated;
  }

  async delete(id: string): Promise<void> {
    await firstValueFrom(this.http.delete<void>(`${BASE_URL}/${id}`));
    this.state.update((orgs) => orgs.filter((org) => org.id !== id));
  }

  async publish(id: string): Promise<Organization> {
    return this.setStatus(id, 'published');
  }

  async pause(id: string): Promise<Organization> {
    return this.setStatus(id, 'paused');
  }

  async reorder(orderedIds: string[]): Promise<void> {
    await firstValueFrom(this.http.post(`${BASE_URL}/reorder`, { orderedIds }));
    const orderById = new Map(orderedIds.map((id, index) => [id, index]));
    this.state.update((orgs) => orgs.map((org) => ({ ...org, order: orderById.get(org.id) ?? org.order })));
  }

  private async setStatus(id: string, status: OrganizationStatus): Promise<Organization> {
    const action = status === 'published' ? 'publish' : 'pause';
    const updated = await firstValueFrom(this.http.post<Organization>(`${BASE_URL}/${id}/${action}`, {}));
    this.replace(updated);
    return updated;
  }

  private replace(updated: Organization): void {
    this.state.update((orgs) => orgs.map((org) => (org.id === updated.id ? updated : org)));
  }
}

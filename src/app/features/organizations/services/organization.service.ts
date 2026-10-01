import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { API_BASE_URL } from '../../../core/http/api-base-url.token';
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
  private readonly baseUrl = `${inject(API_BASE_URL)}/organizations`;

  private readonly state = signal<Organization[]>([]);

  readonly organizations = computed(() => [...this.state()].sort((a, b) => a.order - b.order));

  constructor() {
    void this.refresh();
  }

  async refresh(): Promise<void> {
    const orgs = await firstValueFrom(this.http.get<Organization[]>(this.baseUrl));
    this.state.set(orgs);
  }

  async create(input: OrganizationCreateInput): Promise<Organization> {
    const org = await firstValueFrom(this.http.post<Organization>(this.baseUrl, input));
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
      this.http.put<Organization>(`${this.baseUrl}/${id}/translations`, { language, translation, newSlug }),
    );
    this.replace(updated);
    return updated;
  }

  async removeTranslation(id: string, language: ContentLanguage): Promise<Organization> {
    const updated = await firstValueFrom(
      this.http.delete<Organization>(`${this.baseUrl}/${id}/translations/${language}`),
    );
    this.replace(updated);
    return updated;
  }

  async updateSharedFields(id: string, sharedFields: OrganizationSharedFields): Promise<Organization> {
    const updated = await firstValueFrom(
      this.http.patch<Organization>(`${this.baseUrl}/${id}/shared-fields`, { sharedFields }),
    );
    this.replace(updated);
    return updated;
  }

  async delete(id: string): Promise<void> {
    await firstValueFrom(this.http.delete<void>(`${this.baseUrl}/${id}`));
    this.state.update((orgs) => orgs.filter((org) => org.id !== id));
  }

  async publish(id: string): Promise<Organization> {
    return this.setStatus(id, 'published');
  }

  async pause(id: string): Promise<Organization> {
    return this.setStatus(id, 'paused');
  }

  async reorder(orderedIds: string[]): Promise<void> {
    await firstValueFrom(this.http.post(`${this.baseUrl}/reorder`, { orderedIds }));
    const orderById = new Map(orderedIds.map((id, index) => [id, index]));
    this.state.update((orgs) => orgs.map((org) => ({ ...org, order: orderById.get(org.id) ?? org.order })));
  }

  private async setStatus(id: string, status: OrganizationStatus): Promise<Organization> {
    const action = status === 'published' ? 'publish' : 'pause';
    const updated = await firstValueFrom(this.http.post<Organization>(`${this.baseUrl}/${id}/${action}`, {}));
    this.replace(updated);
    return updated;
  }

  private replace(updated: Organization): void {
    this.state.update((orgs) => orgs.map((org) => (org.id === updated.id ? updated : org)));
  }
}

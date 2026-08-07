import { Injectable } from '@angular/core';
import { SectionTranslation } from '../models/section.model';
import { ContentLanguage } from '../models/content-language.model';

interface CacheEntry {
  sourceTranslation: SectionTranslation;
  suggestion: SectionTranslation;
}

@Injectable({ providedIn: 'root' })
export class StaleTranslationSuggestionCache {
  private readonly cache = new Map<string, CacheEntry>();

  get(
    slug: string,
    targetLanguage: ContentLanguage,
    sourceTranslation: SectionTranslation,
  ): SectionTranslation | undefined {
    const entry = this.cache.get(this.key(slug, targetLanguage));
    return entry && entry.sourceTranslation === sourceTranslation ? entry.suggestion : undefined;
  }

  set(
    slug: string,
    targetLanguage: ContentLanguage,
    sourceTranslation: SectionTranslation,
    suggestion: SectionTranslation,
  ): void {
    this.cache.set(this.key(slug, targetLanguage), { sourceTranslation, suggestion });
  }

  private key(slug: string, targetLanguage: ContentLanguage): string {
    return `${slug}:${targetLanguage}`;
  }
}

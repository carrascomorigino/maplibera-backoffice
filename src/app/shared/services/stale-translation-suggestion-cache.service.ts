import { Injectable } from '@angular/core';
import { ContentLanguage } from '../../features/guide/models/content-language.model';

interface CacheEntry<TSource, TSuggestion> {
  sourceRef: TSource;
  suggestion: TSuggestion;
}

@Injectable({ providedIn: 'root' })
export class StaleTranslationSuggestionCache {
  private readonly cache = new Map<string, CacheEntry<unknown, unknown>>();

  get<TSource, TSuggestion>(
    slug: string,
    targetLanguage: ContentLanguage,
    sourceRef: TSource,
  ): TSuggestion | undefined {
    const entry = this.cache.get(this.key(slug, targetLanguage));
    return entry && entry.sourceRef === sourceRef ? (entry.suggestion as TSuggestion) : undefined;
  }

  set<TSource, TSuggestion>(
    slug: string,
    targetLanguage: ContentLanguage,
    sourceRef: TSource,
    suggestion: TSuggestion,
  ): void {
    this.cache.set(this.key(slug, targetLanguage), { sourceRef, suggestion });
  }

  private key(slug: string, targetLanguage: ContentLanguage): string {
    return `${slug}:${targetLanguage}`;
  }
}

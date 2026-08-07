import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { ContentLanguage } from '../../features/guide/models/content-language.model';

@Injectable({ providedIn: 'root' })
export class TranslationSuggestionService {
  private readonly http = inject(HttpClient);

  async suggest(
    source: { language: ContentLanguage; fields: Record<string, unknown> },
    targetLanguage: ContentLanguage,
  ): Promise<Record<string, unknown>> {
    return firstValueFrom(
      this.http.post<Record<string, unknown>>('/api/translate', {
        sourceLanguage: source.language,
        targetLanguage,
        fields: source.fields,
      }),
    );
  }
}

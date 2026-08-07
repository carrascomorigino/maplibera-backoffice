import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { SectionTranslation } from '../models/section.model';
import { ContentLanguage } from '../models/content-language.model';

@Injectable({ providedIn: 'root' })
export class TranslationSuggestionService {
  private readonly http = inject(HttpClient);

  async suggest(
    source: { language: ContentLanguage; translation: SectionTranslation },
    targetLanguage: ContentLanguage,
  ): Promise<SectionTranslation> {
    return firstValueFrom(
      this.http.post<SectionTranslation>('/api/translate', {
        sourceLanguage: source.language,
        targetLanguage,
        ...source.translation,
      }),
    );
  }
}

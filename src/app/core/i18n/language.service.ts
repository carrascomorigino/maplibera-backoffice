import { Injectable, computed, signal } from '@angular/core';
import { Translations, UiLanguage } from './models/language.model';
import { en } from './translations/en';
import { es } from './translations/es';

const STORAGE_KEY = 'app-language';

@Injectable({ providedIn: 'root' })
export class LanguageService {
  private readonly _language = signal<UiLanguage>(this.detectInitialLanguage());

  readonly language = this._language.asReadonly();
  readonly t = computed<Translations>(() => (this._language() === 'es' ? es : en));

  setLanguage(lang: UiLanguage): void {
    this._language.set(lang);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, lang);
    }
  }

  private detectInitialLanguage(): UiLanguage {
    if (typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'es' || stored === 'en') {
        return stored;
      }
    }
    if (typeof navigator !== 'undefined' && navigator?.language?.toLowerCase().startsWith('es')) {
      return 'es';
    }
    return 'en';
  }
}

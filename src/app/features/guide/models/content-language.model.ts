export type ContentLanguage = 'es' | 'en' | 'fr' | 'pt';

export const CONTENT_LANGUAGES: readonly ContentLanguage[] = ['es', 'en', 'fr', 'pt'];

export const CONTENT_LANGUAGE_LABELS: Record<ContentLanguage, string> = {
  es: 'Español',
  en: 'English',
  fr: 'Français',
  pt: 'Português',
};

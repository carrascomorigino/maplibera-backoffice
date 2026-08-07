import { LanguageService } from './language.service';
import { en } from './translations/en';
import { es } from './translations/es';

const STORAGE_KEY = 'app-language';

function setup(): LanguageService {
  return new LanguageService();
}

describe('LanguageService', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('initial detection', () => {
    it('uses Spanish when the browser language is Spanish and nothing is stored', () => {
      vi.stubGlobal('navigator', { language: 'es-AR' });

      const service = setup();

      expect(service.language()).toBe('es');
    });

    it('defaults to English for a non-Spanish browser language', () => {
      vi.stubGlobal('navigator', { language: 'fr-FR' });

      const service = setup();

      expect(service.language()).toBe('en');
    });

    it('defaults to English when navigator is unavailable (e.g. during SSR)', () => {
      vi.stubGlobal('navigator', undefined);

      let service!: LanguageService;
      expect(() => (service = setup())).not.toThrow();

      expect(service.language()).toBe('en');
    });

    it('prefers a stored preference over the browser language', () => {
      localStorage.setItem(STORAGE_KEY, 'es');
      vi.stubGlobal('navigator', { language: 'en-US' });

      const service = setup();

      expect(service.language()).toBe('es');
    });
  });

  describe('setLanguage', () => {
    it('updates the language signal and persists the choice', () => {
      vi.stubGlobal('navigator', { language: 'en-US' });
      const service = setup();

      service.setLanguage('es');

      expect(service.language()).toBe('es');
      expect(localStorage.getItem(STORAGE_KEY)).toBe('es');
    });

    it('does not throw when localStorage is unavailable', () => {
      vi.stubGlobal('localStorage', undefined);
      vi.stubGlobal('navigator', { language: 'en-US' });

      let service!: LanguageService;
      expect(() => (service = setup())).not.toThrow();
      expect(() => service.setLanguage('es')).not.toThrow();
    });
  });

  describe('t()', () => {
    it('returns the Spanish dictionary when the language is es', () => {
      vi.stubGlobal('navigator', { language: 'es-AR' });
      const service = setup();

      expect(service.t()).toBe(es);
    });

    it('returns the English dictionary when the language is en', () => {
      vi.stubGlobal('navigator', { language: 'fr-FR' });
      const service = setup();

      expect(service.t()).toBe(en);
    });
  });
});

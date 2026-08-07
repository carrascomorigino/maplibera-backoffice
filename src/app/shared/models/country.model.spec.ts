import { COUNTRY_CODES, countryDisplayName } from './country.model';

describe('country.model', () => {
  describe('COUNTRY_CODES', () => {
    it('has no duplicate codes', () => {
      expect(new Set(COUNTRY_CODES).size).toBe(COUNTRY_CODES.length);
    });

    it('has a plausible number of ISO 3166-1 alpha-2 codes', () => {
      expect(COUNTRY_CODES.length).toBeGreaterThan(190);
    });

    it('only contains 2-letter uppercase codes', () => {
      expect(COUNTRY_CODES.every((code) => /^[A-Z]{2}$/.test(code))).toBe(true);
    });
  });

  describe('countryDisplayName', () => {
    it('returns a non-empty localized name in Spanish', () => {
      expect(countryDisplayName('AR', 'es')).toBe('Argentina');
      expect(countryDisplayName('BR', 'es').length).toBeGreaterThan(0);
    });

    it('returns a non-empty localized name in English', () => {
      expect(countryDisplayName('US', 'en')).toBe('United States');
      expect(countryDisplayName('BR', 'en').length).toBeGreaterThan(0);
    });

    it('returns different names in different languages when applicable', () => {
      expect(countryDisplayName('ES', 'es')).not.toBe(countryDisplayName('ES', 'en'));
    });
  });
});

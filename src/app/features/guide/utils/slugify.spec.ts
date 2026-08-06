import { slugify } from './slugify';

describe('slugify', () => {
  it('lowercases the input', () => {
    expect(slugify('Getting Started')).toBe('getting-started');
  });

  it('trims leading and trailing whitespace', () => {
    expect(slugify('  Hello World  ')).toBe('hello-world');
  });

  it('strips diacritics', () => {
    expect(slugify('Configuración de Peñas')).toBe('configuracion-de-penas');
  });

  it('replaces runs of non-alphanumeric characters with a single hyphen', () => {
    expect(slugify('Hello!!  World??')).toBe('hello-world');
  });

  it('collapses multiple consecutive separators into one hyphen', () => {
    expect(slugify('a---b   c')).toBe('a-b-c');
  });

  it('strips leading and trailing hyphens produced by punctuation', () => {
    expect(slugify('--Hello World--')).toBe('hello-world');
  });

  it('keeps numbers', () => {
    expect(slugify('Section 42')).toBe('section-42');
  });

  it('returns an empty string for empty input', () => {
    expect(slugify('')).toBe('');
  });

  it('returns an empty string for input with only punctuation', () => {
    expect(slugify('!!!')).toBe('');
  });
});

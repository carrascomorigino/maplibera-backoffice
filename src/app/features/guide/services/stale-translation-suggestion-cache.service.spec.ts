import { StaleTranslationSuggestionCache } from './stale-translation-suggestion-cache.service';
import { SectionTranslation } from '../models/section.model';

function setup(): StaleTranslationSuggestionCache {
  return new StaleTranslationSuggestionCache();
}

describe('StaleTranslationSuggestionCache', () => {
  it('returns undefined when nothing is cached', () => {
    const cache = setup();
    const source: SectionTranslation = { title: 'Title', description: 'Desc' };

    expect(cache.get('a-slug', 'es', source)).toBeUndefined();
  });

  it('returns the cached suggestion when the source translation reference is unchanged', () => {
    const cache = setup();
    const source: SectionTranslation = { title: 'Title', description: 'Desc' };
    const suggestion: SectionTranslation = { title: 'Título', description: 'Descripción' };

    cache.set('a-slug', 'es', source, suggestion);

    expect(cache.get('a-slug', 'es', source)).toBe(suggestion);
  });

  it('misses when the source translation reference has changed (e.g. after a new save)', () => {
    const cache = setup();
    const originalSource: SectionTranslation = { title: 'Title', description: 'Desc' };
    const suggestion: SectionTranslation = { title: 'Título', description: 'Descripción' };
    cache.set('a-slug', 'es', originalSource, suggestion);

    const newSource: SectionTranslation = { title: 'Title v2', description: 'Desc' };

    expect(cache.get('a-slug', 'es', newSource)).toBeUndefined();
  });

  it('keys independently by slug and by target language', () => {
    const cache = setup();
    const source: SectionTranslation = { title: 'Title', description: 'Desc' };
    const suggestion: SectionTranslation = { title: 'Título', description: 'Descripción' };
    cache.set('a-slug', 'es', source, suggestion);

    expect(cache.get('other-slug', 'es', source)).toBeUndefined();
    expect(cache.get('a-slug', 'fr', source)).toBeUndefined();
  });
});

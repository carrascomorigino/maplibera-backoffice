import { StaleTranslationSuggestionCache } from './stale-translation-suggestion-cache.service';

interface Translation {
  title: string;
  description: string;
}

function setup(): StaleTranslationSuggestionCache {
  return new StaleTranslationSuggestionCache();
}

describe('StaleTranslationSuggestionCache', () => {
  it('returns undefined when nothing is cached', () => {
    const cache = setup();
    const source: Translation = { title: 'Title', description: 'Desc' };

    expect(cache.get('a-slug', 'es', source)).toBeUndefined();
  });

  it('returns the cached suggestion when the source reference is unchanged', () => {
    const cache = setup();
    const source: Translation = { title: 'Title', description: 'Desc' };
    const suggestion: Translation = { title: 'Título', description: 'Descripción' };

    cache.set('a-slug', 'es', source, suggestion);

    expect(cache.get('a-slug', 'es', source)).toBe(suggestion);
  });

  it('misses when the source reference has changed (e.g. after a new save)', () => {
    const cache = setup();
    const originalSource: Translation = { title: 'Title', description: 'Desc' };
    const suggestion: Translation = { title: 'Título', description: 'Descripción' };
    cache.set('a-slug', 'es', originalSource, suggestion);

    const newSource: Translation = { title: 'Title v2', description: 'Desc' };

    expect(cache.get('a-slug', 'es', newSource)).toBeUndefined();
  });

  it('keys independently by slug and by target language', () => {
    const cache = setup();
    const source: Translation = { title: 'Title', description: 'Desc' };
    const suggestion: Translation = { title: 'Título', description: 'Descripción' };
    cache.set('a-slug', 'es', source, suggestion);

    expect(cache.get('other-slug', 'es', source)).toBeUndefined();
    expect(cache.get('a-slug', 'fr', source)).toBeUndefined();
  });

  it('works with any source/suggestion shape, not just a fixed translation type', () => {
    const cache = setup();
    const source = { ingredients: ['Flour', 'Sugar'] };
    const suggestion = { ingredients: ['Harina', 'Azúcar'] };

    cache.set('a-recipe', 'es', source, suggestion);

    expect(cache.get('a-recipe', 'es', source)).toBe(suggestion);
  });
});

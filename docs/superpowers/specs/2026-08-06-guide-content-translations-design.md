# Guide content translations with AI-suggested drafts

**Date:** 2026-08-06
**Status:** Approved
**Feature:** `src/app/features/guide/**`, `src/server.ts`, `src/server/` (new)

## Context

The `guide` feature's `Section` model currently holds a single, non-localized
`title`, `description`, and optional `question`. This spec adds per-section,
multi-language content: each section can have a translation in any of
Spanish, English, French, or Portuguese, editable independently, with an
AI-suggested first draft when a language is added for the first time.

This is the second of two related specs. It depends on the first spec
([2026-08-06-global-language-selector-i18n-design.md](2026-08-06-global-language-selector-i18n-design.md))
for `LanguageService`, whose current UI language (`es`/`en`) seeds the
default content language shown per section. Content languages (`es`/`en`/
`fr`/`pt`) are an independent set from UI languages (`es`/`en` only) — they
share the `es`/`en` codes but are modeled and configured separately, since
UI labels and guide content have different language coverage.

## Goals

1. `Section` supports independent translations per language for `title`,
   `description`, and `question`; `slug`, `imageUrl`, `status`, `order`, and
   timestamps stay shared across languages.
2. Each row in the sections list has its own language selector
   (ES/EN/FR/PT), defaulting to the app's current UI language (falling back
   to the section's first available language if that one isn't translated
   yet).
3. Selecting an already-translated language in a row switches the row's
   displayed title/description to that language, with no side effects.
4. Selecting a not-yet-translated language opens the section editor
   pre-filled with an AI-suggested translation (via the Gemini API),
   translated from whichever language the row was previously showing.
5. Saving a translation updates the section's available-languages display
   in the list.
6. The editor shows an indicator of which language is being worked on, both
   when creating a new section and when editing an existing one.
7. Canceling the editor after selecting a new, not-yet-translated language
   reverts that row's selector back to the language it showed before.
8. Built test-first per project convention.

## Non-goals

- No UI-label translation here — that's spec 1's scope.
- No manual "translate all languages at once" bulk action — translations
  are added one language at a time, on demand, per section.
- No editable/configurable AI prompt or model choice in the UI — the
  translation prompt and model are fixed in code.
- No retry/queueing infrastructure for failed AI calls — a failed
  suggestion falls back once to showing the untranslated source text
  (section 4); the user can still trigger a retry by re-selecting the
  language, but nothing is retried automatically.

## 1. Data model

New content-language model, independent of `UiLanguage`:

```ts
// src/app/features/guide/models/content-language.model.ts
export type ContentLanguage = 'es' | 'en' | 'fr' | 'pt';

export const CONTENT_LANGUAGES: readonly ContentLanguage[] = ['es', 'en', 'fr', 'pt'];

export const CONTENT_LANGUAGE_LABELS: Record<ContentLanguage, string> = {
  es: 'Español',
  en: 'English',
  fr: 'Français',
  pt: 'Português',
};
```

`Section` separates shared metadata from per-language content:

```ts
// src/app/features/guide/models/section.model.ts
export interface SectionTranslation {
  title: string;
  description: string;
  question?: Question;
}

export interface Section {
  slug: string;
  imageUrl: string;
  status: SectionStatus;
  order: number;
  createdAt: string;
  updatedAt: string;
  translations: Partial<Record<ContentLanguage, SectionTranslation>>;
}
```

`Question`, `QuestionAnswer`, `QuestionType` are unchanged, just nested
under `SectionTranslation` instead of hanging directly off `Section`.

## 2. `SectionService`

Creating, editing an existing translation, and adding a new language are
the same operation from the UI's perspective (same drawer, same Save
button), so they share one save method:

```ts
export interface SectionTranslationInput {
  slug: string;
  imageUrl: string;
  language: ContentLanguage;
  translation: SectionTranslation;
}

create(input: SectionTranslationInput): Section;
saveTranslation(currentSlug: string, input: SectionTranslationInput): void;
```

- `create()` builds a new `Section` with `translations: { [input.language]: input.translation }`.
- `saveTranslation()` looks up the section by `currentSlug`, upserts
  `translations[input.language]`, applies a possible `slug` rename and
  `imageUrl` change, and bumps `updatedAt`. It never removes other existing
  translations.
- `publish`, `pause`, `reorder` are unchanged — they operate on shared
  metadata, not per-language content.
- **Legacy data:** `loadFromStorage()` keeps its existing defensive
  filtering (invalid JSON → empty list, missing/empty `slug` → dropped) and
  additionally drops any entry whose `translations` has no valid,
  non-empty language key — the same defensive-migration precedent already
  used for `slug` in the prior spec.

## 3. Sections-list UI: per-row language selector

The row markup currently inline in `sections-list.page.html` is extracted
into `components/section-list-item/`, since it now needs its own local
state:

```
selectedLanguage = signal<ContentLanguage>(initialLanguageFor(section));
```

`initialLanguageFor()`: the app's current `LanguageService.language()` if
that language exists in `section().translations`, otherwise the first
available language in `section().translations`.

- The row's dropdown (`ES | EN | FR | PT`) is bound to `selectedLanguage()`.
  Options that already have a translation are visually distinguished
  (checkmark/bold) from ones that don't.
- Displayed title/description = `section().translations[selectedLanguage()]`.
- Below the title, a row of informational (non-interactive) chips lists all
  languages the section currently has translated — this is the explicit
  "available languages" display in the list, separate from the interactive
  dropdown itself.

**On dropdown change:**

```ts
const previous = selectedLanguage();
selectedLanguage.set(newLang);

if (section().translations[newLang]) {
  // already translated: just switches the row's display, nothing else
} else {
  // opens the editor to translate into newLang
  openDrawer({ section: section(), targetLanguage: newLang, sourceLanguage: previous });
}
```

## 4. Editor (`SectionFormDrawer`)

- Displays a fixed indicator chip with `CONTENT_LANGUAGE_LABELS[language]`
  for the language currently being worked on — shown both when creating a
  brand-new section (language = the app's current UI language) and when
  editing an existing one.
- If `targetLanguage` has no translation yet and a `sourceLanguage` was
  provided: requests an AI suggestion (section 5) using the source
  language's text, shows a loading state over the form, then pre-fills the
  editable form with the result.
  - If the AI call fails: shows a non-blocking error notice (snackbar) and
    pre-fills the form with the **source language's untranslated text**
    instead of leaving it empty, so the user can translate manually rather
    than starting from a blank form.
- If `targetLanguage` already has a translation: pre-fills the form with
  that existing translation — a normal edit, no AI call.
- **Save** calls `sectionService.saveTranslation(...)`. The row is already
  showing `targetLanguage`, so no further list-side update is needed beyond
  the service's own signal update propagating through `computed()`.
- **Cancel** emits a cancellation event; `section-list-item` resets
  `selectedLanguage` back to the `previous` value captured before the
  dropdown change, discarding anything unsaved.

## 5. AI-suggested translation backend

Translation logic is a pure, testable function separate from Express
wiring:

```
src/server/
└── translate-section.ts
```

```ts
export interface TranslateSectionRequest {
  sourceLanguage: ContentLanguage;
  targetLanguage: ContentLanguage;
  title: string;
  description: string;
  question?: Question;
}

export async function translateSection(
  client: GoogleGenAI,
  request: TranslateSectionRequest,
): Promise<SectionTranslation> {
  const response = await client.models.generateContent({
    model: 'gemini-flash-latest',
    contents: JSON.stringify({
      title: request.title,
      description: request.description,
      question: request.question,
    }),
    config: {
      systemInstruction:
        'You are a professional translator for an app guide. Translate the ' +
        'given JSON fields from {sourceLanguage} to {targetLanguage}, ' +
        'preserving markdown formatting in "description" and the exact ' +
        'structure of "question"/"answers". Respond with ONLY valid JSON ' +
        'matching the input shape, no prose.',
      responseMimeType: 'application/json',
    },
  });
  return parseTranslationResponse(response); // validates/parses JSON; throws on malformed output
}
```

`src/server.ts` adds only the route wiring:

```ts
app.use(express.json());
app.post('/api/translate', async (req, res) => {
  try {
    res.json(await translateSection(geminiClient, req.body));
  } catch {
    res.status(502).json({ error: 'translation_failed' });
  }
});
```

`geminiClient` is constructed once at module load:
`new GoogleGenAI({ apiKey: process.env['GEMINI_API_KEY'] })`. New
dependency: `@google/genai`.

**API key configuration:** new dependency `dotenv`, loaded at the top of
`src/server.ts` in non-production, reading a local `.env`. `.env.example`
(with `GEMINI_API_KEY=`) is committed; `.env` itself is added to
`.gitignore`. In production the key is set as a real environment variable
by the hosting platform, no `.env` file involved.

**Dev workflow:** `npm start` (`ng serve`) does not run `src/server.ts`, so
the API endpoint isn't reachable through it by default. This spec adds:

- `proxy.conf.json` at the repo root: `{ "/api/*": { "target": "http://localhost:4000", "secure": false } }`.
- `angular.json` → `projects.maplibera-backoffice.architect.serve.options.proxyConfig: "proxy.conf.json"`.
- A new `dev:api` npm script (`tsx watch src/server.ts`, new dev dependency
  `tsx`) to run the backend during development.
- `CLAUDE.md`'s Commands section gets a note that testing the AI-suggestion
  flow locally requires both `npm start` and `npm run dev:api` running
  together (two terminals); the rest of the app works with `npm start`
  alone, since a missing/unreachable backend degrades to the
  untranslated-source-text fallback rather than breaking the feature.

**`TranslationSuggestionService`** (`src/app/features/guide/services/`):

```ts
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
```

A single `Promise`-based method rather than `httpResource`/an `Observable`
stream, since this is one imperative action triggered when the drawer
opens for a new language — there's no ongoing reactive state to justify a
derived signal. `app.config.ts` adds `provideHttpClient(withFetch())`.

## 6. Testing (test-first)

`section.service.spec.ts` (updated, written before touching the
implementation):
- `create()` produces `translations` with exactly one language key.
- `saveTranslation()` on an existing language updates only that language.
- `saveTranslation()` on a new language adds the key without dropping
  existing ones.
- `saveTranslation()` with a different `slug` renames the section (same
  behavior as today's `update`).
- Loading from `localStorage` drops entries with empty/missing
  `translations`.

`translate-section.spec.ts` (new, written before `translate-section.ts`):
- With a mocked Gemini client (`vi.fn()` standing in for
  `models.generateContent`), verifies the `contents`/`config.systemInstruction`
  payload sent includes `sourceLanguage`/`targetLanguage`/title/description/question
  correctly.
- A valid JSON response parses into a `SectionTranslation`.
- A malformed response (non-JSON, or JSON with the wrong shape) causes the
  function to throw, so the route returns 502.

`translation-suggestion.service.spec.ts` (new, written before the
service): using `provideHttpClientTesting`/`HttpTestingController`:
- `suggest()` issues `POST /api/translate` with body
  `{ sourceLanguage, targetLanguage, title, description, question }`.
- Resolves with the translation on a 200 response.
- Rejects (propagates the error) on an error response — the fallback
  handling (notice + source-text prefill) is tested in the drawer, not
  here.

`section-list-item.spec.ts` (new component, spec-first):
- Initial displayed language is the app's UI language if the section has
  it translated, else the section's first available language.
- Selecting an already-translated language switches the displayed text and
  does not emit a drawer-open event.
- Selecting a new language emits a drawer-open event with the correct
  `sourceLanguage`/`targetLanguage`.
- A drawer-cancel event resets `selectedLanguage` to its previous value.
- Available-language chips reflect `section().translations`.

`section-form-drawer.spec.ts` (updated):
- Creating a new section: does not call `TranslationSuggestionService`;
  indicator shows the app's current UI language.
- Editing an already-translated language: pre-fills that translation, does
  not call the suggestion service.
- Adding a new language with a `sourceLanguage` present: calls
  `suggest()`, shows a loading state, pre-fills the form with the result on
  success.
- `suggest()` rejecting: shows a non-blocking notice and pre-fills the
  form with the untranslated source text.
- Language indicator is visible in both the create and edit cases.

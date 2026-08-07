# Global language selector and UI i18n

**Date:** 2026-08-06
**Status:** Approved
**Feature:** `src/app/core/i18n/` (new), `src/app/app.ts` / `src/app/app.html`, `src/app/features/guide/**`

## Context

The app currently has no i18n infrastructure of any kind: no `@angular/localize`,
no translation library, no locale files, and no app-wide state service. The
only persistent chrome is the nav bar in `app.html`/`app.ts`, and all UI
strings across `app.html` and every `guide` component are hardcoded, mixed
Spanish/English literals.

This is the first of two related specs. This one builds the app-wide language
selector and translates all existing UI labels. The second spec (follow-up)
adds per-section, multi-language **content** translation inside `guide`
(titles, descriptions, questions), which depends on this spec's
`LanguageService` to seed its own default language.

## Goals

1. A global language toggle (ES | EN) in the app nav, backed by a
   `LanguageService`.
2. Initial language: read a previously saved user choice from
   `localStorage`; otherwise detect via `navigator.language` — Spanish
   browsers get Spanish, everything else (including undetectable, SSR)
   defaults to English.
3. Switching language updates all UI labels instantly, app-wide, and persists
   the choice for future visits.
4. Every existing hardcoded string in `app.html` and all of
   `src/app/features/guide/**` (nav, sections list, section form drawer,
   markdown editor, question editor, including dynamic validation messages)
   is translated to both Spanish and English.
5. Built test-first per project convention.

## Non-goals

- No `@angular/localize` and no third-party i18n library — see "Mechanism"
  below for rationale.
- No languages beyond Spanish/English for UI labels (content languages for
  `guide`, e.g. French/Portuguese, are the second spec's concern and are a
  separate, independent language set).
- No backend/API changes — language preference stays in `localStorage`,
  matching `SectionService`'s existing persistence pattern.
- No automated translation (AI-suggested or otherwise) for UI labels — these
  are a small, fixed set of strings translated by hand as part of this spec.

## Mechanism: custom runtime service, not `@angular/localize`

`@angular/localize` compiles a separate bundle per locale (build-time),
which doesn't fit an in-app toggle that must switch instantly without a
reload/rebuild. A third-party library (ngx-translate, transloco) would add a
new dependency for functionality this app doesn't need yet (only 2 UI
languages, no pluralization/lazy-loading requirements). Instead: a small
`LanguageService` following the same signal + `computed()` pattern already
used by `SectionService`, with translation dictionaries as plain typed TS
objects.

## 1. File layout

```
src/app/core/i18n/
├── models/
│   └── language.model.ts       // UiLanguage type, Translations interface
├── translations/
│   ├── en.ts                   // const en: Translations = {...}
│   └── es.ts                   // const es: Translations = {...}
├── language.service.ts
├── language.service.spec.ts
└── components/
    └── language-toggle/
        ├── language-toggle.ts
        ├── language-toggle.html
        └── language-toggle.spec.ts
```

`src/app/core/` is new — the first piece of app-wide (non-feature) code in
the project.

## 2. Data model

```ts
// language.model.ts
export type UiLanguage = 'es' | 'en';

export interface Translations {
  nav: {
    appTitle: string;
    sectionsLink: string;
  };
  guide: {
    sectionsList: { /* title, addButton, emptyState, statusLabels, ... */ };
    sectionForm: { /* field labels, save/publish/cancel buttons, ... */ };
    markdownEditor: { /* toolbar tooltips, preview toggle */ };
    questionEditor: { /* type labels, add-answer button, all/none-of-the-above */ };
  };
}
```

`en.ts` and `es.ts` are each declared `const en: Translations = {...}` (and
`es` likewise) — TypeScript's structural typing rejects either file at
compile time if a key is missing or misshapen, which removes the need for a
runtime or test-based key-parity check.

Dynamic strings (e.g. "slug already exists: {value}") are typed as functions
`(value: string) => string` inside the dictionary rather than plain strings,
so callers interpolate by invoking them: `t().sectionForm.duplicateSlug(slug)`.

## 3. `LanguageService`

```ts
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
      if (stored === 'es' || stored === 'en') return stored;
    }
    if (typeof navigator !== 'undefined' && navigator.language?.toLowerCase().startsWith('es')) {
      return 'es';
    }
    return 'en';
  }
}
```

The `typeof localStorage/navigator === 'undefined'` guards mirror the exact
SSR-safety pattern already used in `SectionService`
(`src/app/features/guide/services/section.service.ts:81-90`), so the service
behaves correctly during server-side rendering.

## 4. Consuming translations in templates

No custom pipe. A pure pipe wouldn't re-evaluate when the signal read inside
its `transform()` changes, and an impure pipe would force re-evaluation on
every change-detection cycle for no benefit. Instead, components inject the
service directly and read the `computed()` dictionary in the template — the
same pattern `sections-list.page.html` already uses for
`sectionService.sections()`:

```ts
protected readonly language = inject(LanguageService);
```

```html
<button>{{ language.t().guide.sectionForm.saveButton }}</button>
```

## 5. Selector UI

`app.html` gains a `mat-button-toggle-group` in the nav, replacing the fixed
title/link text with translated equivalents:

```html
<mat-button-toggle-group
  [value]="language.language()"
  (change)="language.setLanguage($event.value)"
>
  <mat-button-toggle value="es">ES</mat-button-toggle>
  <mat-button-toggle value="en">EN</mat-button-toggle>
</mat-button-toggle-group>
```

`App` (`app.ts`) drops its standalone `title` signal in favor of
`language.t().nav.appTitle`.

## 6. Migration scope

Every hardcoded string in the following files is replaced with a call into
`language.t()...`:

- `app.html`
- `src/app/features/guide/pages/sections-list/sections-list.page.html`
- `src/app/features/guide/components/section-form-drawer/section-form-drawer.html`
- `src/app/features/guide/components/markdown-editor/markdown-editor.html`
- `src/app/features/guide/components/question-editor/question-editor.html`

Existing specs for these components that currently query the DOM by literal
text (e.g. `getByText('Save')`) are updated to query by `data-testid` or
ARIA role instead, so they don't break when the rendered language changes
and don't encode a specific language as an implicit test dependency.

## 7. Testing (test-first)

`language.service.spec.ts` is written before `language.service.ts` and
covers:

- No stored preference, `navigator.language` `'es-AR'` → `language()` is
  `'es'`.
- No stored preference, `navigator.language` `'fr-FR'` (non-Spanish) →
  `'en'`.
- No `navigator` available (SSR simulation) → `'en'`.
- Stored `'es'` in `localStorage` takes priority over
  `navigator.language` `'en-US'`.
- `setLanguage('es')` updates `language()` and persists `'es'` under
  `'app-language'` in `localStorage`.
- `t()` returns the `es` dictionary when `language()` is `'es'`, `en`
  otherwise.
- `navigator`/`localStorage` are mocked via Vitest's `vi.stubGlobal`,
  consistent with existing test setup in the project.

`language-toggle.spec.ts` (written before the component) covers:

- Renders both ES/EN toggle options.
- The active toggle reflects `languageService.language()`.
- Clicking the inactive toggle calls `languageService.setLanguage(...)`
  with the correct value.

Existing `guide` component specs are updated (not newly written) to use
`data-testid`/role-based queries per the migration-scope note above.

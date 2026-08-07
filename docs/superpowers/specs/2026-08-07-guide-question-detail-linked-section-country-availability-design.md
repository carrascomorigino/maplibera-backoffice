# Guide sections: question detail, linked section, country availability, character counters, and tag placement

**Date:** 2026-08-07
**Status:** Approved
**Feature:** `src/app/features/guide/`

## Context

The `guide` feature's `SectionFormDrawer` edits `title`, `slug`, `description`,
`imageUrl`, and an optional `question` (see
[2026-08-06-guide-section-question-design.md](2026-08-06-guide-section-question-design.md)).
This spec adds five independent improvements requested together:

1. An optional, translatable "detail" text field on the question.
2. An optional selector to link the section to another existing section.
3. An optional country-availability restriction on the section (default: all
   countries).
4. Character-remaining counters on the free-text fields.
5. Moving the language-availability tags in the sections list from beside the
   title to the bottom of the row.

## Goals

1. `Question` gains an optional `detail` field, translated the same way as
   `text` (part of `SectionTranslation.question`). It is unrelated to
   `type`/answers and can be filled independently of them.
2. `Section` gains an optional `linkedSectionSlug`, a reference to another
   section's slug. Not translated — one value per section regardless of
   working language. Any existing section other than the one being edited is
   a valid target, regardless of its `status`.
3. `Section` gains an optional `availableCountries: string[]`. `undefined`
   (the default for new and existing sections) means available in all
   countries. A non-empty array restricts availability to those ISO
   3166-1 alpha-2 codes. The detail field and the linked-section selector are
   independent of each other and of this — any combination of "set" / "not
   set" is valid and saveable.
4. `Title`, `Description`, question `text`, `detail`, and answer `text` show
   how many characters remain as the user types, and are hard-capped at
   their limit:
   - Title: 100
   - Description: 2000
   - Question text: 300
   - Question detail: 500
   - Answer text: 150
5. In the sections list, `<app-language-tags>` moves from sitting next to the
   title to being the last line of the row's content column (below the
   question summary), instead of on the same line as the title.
6. The sections list also shows, when set: the linked section (as its
   slug) and the country restriction (as a count, or "all countries").

## Non-goals

- No backend/API changes — persistence stays in `localStorage` via
  `SectionService`.
- No per-answer detail text — only one detail field per question.
- No validation that a linked section isn't later deleted/renamed in a way
  that orphans the reference — `linkedSectionSlug` is stored as a plain
  string; a dangling reference is simply not resolved to a title in the UI.
- No translated country names stored in the app — names are resolved at
  render time via `Intl.DisplayNames`, not hand-maintained.
- No search/filter inside the country multi-select for this iteration.

## 1. Data model

`src/app/features/guide/models/section.model.ts`:

```ts
export interface Question {
  text: string;
  type: QuestionType;
  detail?: string; // NEW — translated alongside text; independent of type/answers
  yesNoCorrectAnswer?: 'yes' | 'no';
  answers?: QuestionAnswer[];
  includeAllOfTheAbove?: boolean;
  allOfTheAboveCorrect?: boolean;
  includeNoneOfTheAbove?: boolean;
  noneOfTheAboveCorrect?: boolean;
}

export interface Section {
  slug: string;
  imageUrl: string;
  status: SectionStatus;
  order: number;
  createdAt: string;
  updatedAt: string;
  translations: Partial<Record<ContentLanguage, SectionTranslation>>;
  staleLanguages?: Partial<Record<ContentLanguage, ContentLanguage>>;
  linkedSectionSlug?: string; // NEW — not translated
  availableCountries?: string[]; // NEW — undefined/omitted = all countries
}
```

New shared model, `src/app/shared/models/country.model.ts`:

```ts
export const COUNTRY_CODES: readonly string[]; // ISO 3166-1 alpha-2, full list

export function countryDisplayName(code: string, uiLanguage: UiLanguage): string;
// wraps `new Intl.DisplayNames([uiLanguage], { type: 'region' })`
```

New constants, `src/app/features/guide/utils/field-limits.ts`:

```ts
export const TITLE_MAX_LENGTH = 100;
export const DESCRIPTION_MAX_LENGTH = 2000;
export const QUESTION_TEXT_MAX_LENGTH = 300;
export const QUESTION_DETAIL_MAX_LENGTH = 500;
export const ANSWER_TEXT_MAX_LENGTH = 150;
```

## 2. `SectionService`

`SectionTranslationInput` gains the two new section-level fields:

```ts
export interface SectionTranslationInput {
  slug: string;
  imageUrl: string;
  language: ContentLanguage;
  translation: SectionTranslation;
  linkedSectionSlug?: string; // NEW
  availableCountries?: string[]; // NEW
}
```

- `create()`: sets `section.linkedSectionSlug = input.linkedSectionSlug` and
  `section.availableCountries = input.availableCountries` alongside the
  existing fields.
- `saveTranslation()`: same two fields are overwritten on every save (same
  pattern already used for `slug`/`imageUrl`, which are also section-level
  and re-sent on every save regardless of which language is being edited).
- No other method changes — `removeTranslation`/`publish`/`pause`/`reorder`/
  `loadFromStorage` already pass through whatever shape `Section` has.

## 3. `QuestionEditor` — detail field

- New `detail: FormControl<string>` in the internal form, with
  `Validators.maxLength(QUESTION_DETAIL_MAX_LENGTH)`.
- Rendered in `question-editor.html` right after the question type
  select, gated the same way (visible once `text` is non-empty), as a
  multi-line `mat-form-field` textarea with a `maxlength` attribute and a
  trailing `mat-hint` showing characters remaining.
- `writeValue`: `detail: question?.detail ?? ''`.
- `buildQuestion()`: every returned branch (the type-less early return, the
  `yes-no` branch, and the `single`/`multiple` branch) spreads
  `...(raw.detail.trim() ? { detail: raw.detail.trim() } : {})`, matching
  how `yesNoCorrectAnswer`/`imageUrl` are conditionally included today.
- No cross-field validation — detail is always optional regardless of
  whether a type/answers are filled in.

## 4. `SectionFormDrawer` — linked section + country availability

New form controls:

```ts
linkedSectionSlug: new FormControl('', { nonNullable: true }),
countryScope: new FormControl<'all' | 'specific'>('all', { nonNullable: true }),
countries: new FormControl<string[]>([], { nonNullable: true }),
```

- `countries` gets a validator requiring at least one entry when
  `countryScope === 'specific'` (cross-field, same shape as the existing
  `duplicateSlugValidator` — reads `countryScope`'s sibling control off
  `control.parent`).
- **Linked section select**: `<mat-select formControlName="linkedSectionSlug">`
  with an empty/"None" option plus one option per section in
  `sectionService.sections()` excluding the section currently being edited
  (`this.section()?.slug`). Each option's label is `title (slug)`, where
  `title` comes from the candidate section's translation in the current
  `targetLanguage()`, falling back to its first available translation, via a
  new protected `sectionOptionLabel(section: Section): string` method (kept
  out of the template per the "no complex template logic" convention).
- **Country availability**: a radio group for `countryScope` ("All
  countries" / "Specific countries"), and when `specific` is selected, a
  `<mat-select multiple formControlName="countries">` listing
  `COUNTRY_CODES`, each option's label from `countryDisplayName(code,
  language.language())`, sorted alphabetically by that label (computed once
  per render via a `computed()` on the component, keyed off
  `language.language()`).
- `effect()` that resets the form on `section()` change also resets:
  ```ts
  linkedSectionSlug: section?.linkedSectionSlug ?? '',
  countryScope: section?.availableCountries?.length ? 'specific' : 'all',
  countries: section?.availableCountries ?? [],
  ```
- `persist()`: destructures the two new raw values and passes
  `linkedSectionSlug: linkedSectionSlug || undefined` and
  `availableCountries: countryScope === 'specific' ? countries : undefined`
  into both `sectionService.create()` and `sectionService.saveTranslation()`.

## 5. Character counters

- `title` (`section-form-drawer.html`): `maxlength="100"` on the `<input>`,
  plus `<mat-hint align="end">` showing characters remaining, computed from
  a protected `TITLE_MAX_LENGTH` constant exposed on the component and
  `form.controls.title.value.length` (read directly in the template, same
  pattern already used for `form.controls.text.value.trim()` in
  `question-editor.html`).
- `question text` / `answer text` (`question-editor.html`): same
  `maxlength` + `mat-hint` pattern, using `QUESTION_TEXT_MAX_LENGTH` /
  `ANSWER_TEXT_MAX_LENGTH`.
- `detail`: same pattern, `QUESTION_DETAIL_MAX_LENGTH` (see §3).
- `description` (Markdown, custom component): `MarkdownEditor` gains a new
  `maxLength = input<number | undefined>(undefined)` input. When set:
  - the internal `<textarea>` gets `[attr.maxlength]="maxLength()"`.
  - a small counter renders below the toolbar/textarea showing characters
    remaining, using the same wording as the `mat-hint` counters elsewhere.
  - `SectionFormDrawer` passes `[maxLength]="descriptionMaxLength"`
    (`= DESCRIPTION_MAX_LENGTH`) on `<app-markdown-editor>`.
- Wording (both `en.ts`/`es.ts`): a function
  `charactersRemaining: (count: number) => string` per locale (e.g. "45
  characters remaining" / "45 caracteres restantes"), added under a shared
  `guide.fieldLimits` translation key used by all four counter locations.

## 6. Sections list

`section-list-item.html`:

- Move `<app-language-tags>` out of the `flex items-center gap-2` row next
  to `section-title`, into its own line at the end of the `flex-1` content
  column (after the question summary block), with `mt-2` spacing. The title
  row becomes just the title (no wrapping flex/gap needed around it).
- When `section().linkedSectionSlug` is set, render a small line showing the
  linked slug (label + `linkedSectionSlug` value — resolving it to the
  target's title is a nice-to-have, not required, since the target section
  might not exist anymore; render the raw slug for simplicity).
- When `section().availableCountries?.length` is set, render a small line
  with the count (e.g. "3 countries") via a new protected
  `countryAvailabilityLabel(section: Section): string` method on
  `SectionListItem`; sections without the field (or with `undefined`) show
  nothing extra (all countries is the implicit default, not called out).

## 7. Testing plan (TDD — specs written before implementation)

- `question-editor.spec.ts` (add cases):
  - `detail` round-trips through `writeValue`/`buildQuestion` independent of
    `type`/answers being filled in.
  - `detail` is omitted from the built `Question` when blank/whitespace.
  - `maxlength` enforced on the detail textarea.
- `section-form-drawer.spec.ts` (add cases):
  - Saving with `linkedSectionSlug` set persists it on the `Section`
    (`sectionService.create`/`saveTranslation` called with it).
  - The linked-section select excludes the section currently being edited
    and lists every other existing section.
  - Saving with `countryScope: 'all'` persists `availableCountries:
    undefined`; with `'specific'` and countries selected, persists that
    array.
  - Form is invalid when `countryScope: 'specific'` and zero countries are
    selected.
  - Title/description/question inputs are capped at their `maxlength` and
    show the expected remaining-characters text at a couple of sample
    lengths.
- `markdown-editor.spec.ts` (add cases):
  - No counter/`maxlength` attribute rendered when `maxLength` input is
    unset.
  - Counter text and `maxlength` attribute reflect the `maxLength` input
    when set.
- `section-list-item.spec.ts` (add cases):
  - Language tags render after the question summary block, not next to the
    title (assert DOM order, not just presence — reuses existing
    `language-tag-*` test ids).
  - Linked-section line renders only when `linkedSectionSlug` is set, with
    the expected slug text.
  - Country-availability line renders only when `availableCountries` is
    set, with the expected count text; nothing renders when it's
    `undefined`.
- `section.service.spec.ts` (add cases): `linkedSectionSlug` and
  `availableCountries` round-trip unchanged through `create` and
  `saveTranslation`, and are overwritten (not merged) on repeated saves.
- `country.model.spec.ts` (new): `countryDisplayName` returns a localized,
  non-empty name for a sample of codes in both `es` and `en`.

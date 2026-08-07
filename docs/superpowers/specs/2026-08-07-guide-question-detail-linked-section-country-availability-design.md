# Guide sections: question detail, country availability, character counters, and tag placement

**Date:** 2026-08-07
**Status:** Implemented (revised during implementation — see Revision history)
**Feature:** `src/app/features/guide/`

## Revision history

The original spec (below) included a "linked section" selector and a native
`<select multiple>` for country availability. During implementation the user
asked for changes based on seeing it working:

- The list's country-availability wording changed from a count ("3 countries
  available") to the actual localized names, or "worldwide" when unrestricted
  (e.g. "Availability: Peru, Chile" / "Availability: worldwide").
- The question `detail` field became a rich-text (Markdown) field using the
  same `MarkdownEditor` component as the section description, instead of a
  plain textarea — it's substantial enough content to want formatting.
- The country multi-select became a searchable, tag-based picker (type to
  filter, click/Enter to add, click a tag's `×` to remove — no confirmation)
  instead of a native `<select multiple>`, since ⌃/⌘-clicking through ~250
  options doesn't scale.
- The **linked-section selector was removed entirely**. Now that the
  description and question detail are rich text, a link to another section
  can just be a Markdown link to its slug — a dedicated field was redundant.

This revision reflects what's actually implemented. Everything below
describes the final state, not the discarded first draft.

## Context

The `guide` feature's `SectionFormDrawer` edits `title`, `slug`, `description`,
`imageUrl`, and an optional `question` (see
[2026-08-06-guide-section-question-design.md](2026-08-06-guide-section-question-design.md)).
This spec adds:

1. An optional, translatable, rich-text "detail" field on the question.
2. An optional country-availability restriction on the section (default: all
   countries), picked via a searchable tag-based selector.
3. Character-remaining counters on the free-text fields.
4. Moving the language-availability tags in the sections list from beside the
   title to the bottom of the row.

## Goals

1. `Question` gains an optional `detail` field, translated the same way as
   `text` (part of `SectionTranslation.question`). It is unrelated to
   `type`/answers and can be filled independently of them. It's edited with
   the same rich-text `MarkdownEditor` used for the section description.
2. `Section` gains an optional `availableCountries: string[]`. `undefined`
   (the default for new and existing sections) means available in all
   countries. A non-empty array restricts availability to those ISO
   3166-1 alpha-2 codes.
3. `Title`, `Description`, question `text`, `detail`, and answer `text` show
   how many characters remain as the user types, and are hard-capped at
   their limit:
   - Title: 100
   - Description: 2000
   - Question text: 300
   - Question detail: 500
   - Answer text: 150
4. In the sections list, `<app-language-tags>` moves from sitting next to the
   title to being the last line of the row's content column (below the
   question summary), instead of on the same line as the title.
5. The sections list also always shows a country-availability line: the
   localized, comma-separated country names when `availableCountries` is
   set, or a "worldwide" label when it isn't.

## Non-goals

- No backend/API changes — persistence stays in `localStorage` via
  `SectionService`.
- No per-answer detail text — only one detail field per question.
- No dedicated section-to-section linking field — cross-linking is done via
  a Markdown link to the target's slug inside the description/detail rich
  text, resolved by whatever renders the content downstream.
- No translated country names stored in the app — names are resolved at
  render time via `Intl.DisplayNames`, not hand-maintained.

## 1. Data model

`src/app/features/guide/models/section.model.ts`:

```ts
export interface Question {
  text: string;
  type: QuestionType;
  detail?: string; // translated alongside text; independent of type/answers; rich text (Markdown)
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
  availableCountries?: string[]; // undefined/omitted = all countries
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

`SectionTranslationInput` gains one new section-level field:

```ts
export interface SectionTranslationInput {
  slug: string;
  imageUrl: string;
  language: ContentLanguage;
  translation: SectionTranslation;
  availableCountries?: string[];
}
```

- `create()`: sets `section.availableCountries = input.availableCountries`
  alongside the existing fields.
- `saveTranslation()`: `availableCountries` is overwritten on every save
  (same pattern already used for `slug`/`imageUrl`, which are also
  section-level and re-sent on every save regardless of which language is
  being edited).
- No other method changes — `removeTranslation`/`publish`/`pause`/`reorder`/
  `loadFromStorage` already pass through whatever shape `Section` has.

## 3. `QuestionEditor` — rich-text detail field

- `detail: FormControl<string>` in the internal form, with
  `Validators.maxLength(QUESTION_DETAIL_MAX_LENGTH)`.
- Rendered in `question-editor.html` right after the question type
  select, gated the same way (visible once `text` is non-empty): a labeled
  `<app-markdown-editor formControlName="detail" [maxLength]="questionDetailMaxLength" />`,
  the same component and pattern used for the section description in
  `SectionFormDrawer` (toolbar, preview toggle, character counter built in).
- `writeValue`: `detail: question?.detail ?? ''`.
- `buildQuestion()`: every returned branch (the type-less early return, the
  `yes-no` branch, and the `single`/`multiple` branch) spreads
  `...(raw.detail.trim() ? { detail: raw.detail.trim() } : {})`, matching
  how `yesNoCorrectAnswer`/`imageUrl` are conditionally included.
- No cross-field validation — detail is always optional regardless of
  whether a type/answers are filled in.

## 4. `CountrySelect` — searchable, tag-based country picker

New standalone `ControlValueAccessor` component,
`src/app/features/guide/components/country-select/` (`.ts`/`.html`/`.spec.ts`),
bound to a `FormControl<string[]>` exactly like `MarkdownEditor`/
`QuestionEditor` are bound elsewhere. Internal state (all `signal`s):

- `filterText: string` — the typed query.
- `highlightedIndex: number` — index into the filtered options, for keyboard
  navigation.
- `isOpen: boolean` — whether the results listbox is shown (true while the
  filter input has focus).
- `selectedCodes: string[]` — the CVA value.

Computed:

- `allOptions` — every `COUNTRY_CODES` entry mapped to
  `{ code, label: countryDisplayName(code, uiLanguage) }` and sorted by
  label, recomputed when `language.language()` changes.
- `selectedOptions` — `allOptions` filtered to the selected codes (drives the
  chips).
- `filteredOptions` — `allOptions` minus already-selected codes, further
  filtered by a case-insensitive substring match of `filterText` against the
  localized label (drives the listbox).

Behavior:

- Selected countries render as removable chips (`×` button) above the filter
  input. Clicking a chip's `×` removes it **immediately — no confirmation
  dialog** (unlike `LanguageTags`' remove flow, which does confirm) and the
  country reappears in the filtered list.
- The filter `<input>` uses the ARIA combobox pattern: `role="combobox"`,
  `aria-autocomplete="list"`, `aria-expanded`, `aria-controls` pointing at
  the listbox `id`, `aria-activedescendant` pointing at the highlighted
  option's `id`.
- `ArrowDown`/`ArrowUp` move `highlightedIndex` (clamped to the filtered
  list's bounds); `Enter` selects the highlighted option; `Escape` clears
  the filter text.
- Selecting an option (click, or `Enter` on the highlighted one) appends its
  code, clears `filterText`, and resets `highlightedIndex`.
- Each listbox `<li>` has `(mousedown)="$event.preventDefault()"` so
  clicking it doesn't blur (and thus close) the filter input before the
  `(click)` handler runs.
- `writeValue(codes)`, `registerOnChange`, `registerOnTouched`,
  `setDisabledState` implement the CVA contract; `onTouched` fires on blur.
- An `inputId` input (default `'country-select-filter'`) is applied to the
  filter `<input>`'s `id` so a wrapping `<label for>` in the host template
  associates correctly (the host element itself, `<app-country-select>`, is
  not the focusable element).

## 5. `SectionFormDrawer` — country availability

Form controls:

```ts
countryScope: new FormControl<'all' | 'specific'>('all', { nonNullable: true }),
countries: new FormControl<string[]>([], { nonNullable: true }),
```

- `countries` gets a validator requiring at least one entry when
  `countryScope === 'specific'` (cross-field, same shape as the existing
  `duplicateSlugValidator` — reads `countryScope`'s sibling control off
  `control.parent`). `countryScope`'s `valueChanges` calls
  `countries.updateValueAndValidity()` so toggling scope re-evaluates it.
- Template: a radio group for `countryScope` ("All countries" / "Specific
  countries"), and when `specific` is selected,
  `<app-country-select id="countries-select" formControlName="countries" />`
  plus a `mat-error` for the "select at least one" validator.
- `effect()` that resets the form on `section()` change also resets:
  ```ts
  countryScope: section?.availableCountries?.length ? 'specific' : 'all',
  countries: section?.availableCountries ?? [],
  ```
- `persist()`: passes `availableCountries: countryScope === 'specific' ?
  countries : undefined` into both `sectionService.create()` and
  `sectionService.saveTranslation()`.

## 6. Character counters

- `title` (`section-form-drawer.html`): `maxlength="100"` on the `<input>`,
  plus `<mat-hint align="end">` showing characters remaining, computed from
  a protected `TITLE_MAX_LENGTH` constant exposed on the component and
  `form.controls.title.value.length` (read directly in the template, same
  pattern already used for `form.controls.text.value.trim()` in
  `question-editor.html`).
- `question text` / `answer text` (`question-editor.html`): same
  `maxlength` + `mat-hint` pattern, using `QUESTION_TEXT_MAX_LENGTH` /
  `ANSWER_TEXT_MAX_LENGTH`.
- `description` and `detail` (both `MarkdownEditor`): the component takes a
  `maxLength = input<number | undefined>(undefined)` input. When set:
  - the internal `<textarea>` gets `[attr.maxlength]="maxLength()"`.
  - a small counter renders below the toolbar/textarea showing characters
    remaining, using the same wording as the `mat-hint` counters elsewhere.
  - `SectionFormDrawer` passes `[maxLength]="descriptionMaxLength"` on the
    description's `<app-markdown-editor>`; `QuestionEditor` passes
    `[maxLength]="questionDetailMaxLength"` on the detail's.
- Wording (both `en.ts`/`es.ts`): a function
  `charactersRemaining: (count: number) => string` per locale (e.g. "45
  characters remaining" / "45 caracteres restantes"), under a shared
  `guide.fieldLimits` translation key used by all counter locations.

## 7. Sections list

`section-list-item.html`:

- `<app-language-tags>` sits at the end of the `flex-1` content column
  (after the question summary block), on its own line with `mt-2` spacing —
  not next to the title anymore. The title row is just the title.
- A country-availability line always renders (via a new protected
  `countryAvailabilityIndicator(): string` method on `SectionListItem`):
  - When `availableCountries` is set: the localized country names, joined
    with `', '` — e.g. `Disponibilidad: Perú, Chile` / `Availability: Peru,
    Chile`.
  - When it's unset/empty: a "worldwide" label — e.g. `Disponibilidad:
    mundial` / `Availability: worldwide`.
  - Both variants go through the same
    `guide.sectionsList.countryAvailabilityIndicator(countriesText: string)`
    translation function; the "worldwide" word itself is a separate
    `guide.sectionsList.countryAvailabilityWorldwide` string passed in as
    that argument when there's no restriction.

## 8. Testing plan (TDD — specs written before implementation)

- `question-editor.spec.ts`:
  - `detail` renders as a `MarkdownEditor` (`markdown-textarea`), hidden
    until question text is entered.
  - `detail`'s rendered textarea is capped at `QUESTION_DETAIL_MAX_LENGTH`.
  - `detail` round-trips through `writeValue`/`buildQuestion` independent of
    `type`/answers being filled in.
  - `detail` is omitted from the built `Question` when blank/whitespace.
- `country-select.spec.ts` (new):
  - No chips and no listbox before the filter input is focused.
  - Typing filters the listbox by localized country name, case-insensitively.
  - Clicking (or `Enter`-selecting, after `ArrowDown`/`ArrowUp`) an option
    adds a chip, clears the filter text, and removes that option from the
    list.
  - Clicking a chip's remove button removes it immediately (no confirmation)
    and the option reappears in the filtered list.
  - `Escape` clears the filter text.
  - `writeValue` populates initial chips; `writeValue(null)` clears them.
  - `onTouched` fires on blur; `setDisabledState(true)` disables the filter
    input and every chip's remove button.
- `section-form-drawer.spec.ts`:
  - Title input capped at `maxlength` with the expected remaining-characters
    text.
  - Saving with `countryScope: 'all'` persists `availableCountries:
    undefined`; with `'specific'` and countries selected (via
    `form.controls.countries.setValue([...])`), persists that array.
  - Form is invalid when `countryScope: 'specific'` and zero countries are
    selected; valid again once at least one is set.
- `markdown-editor.spec.ts`:
  - No counter/`maxlength` attribute rendered when `maxLength` input is
    unset.
  - Counter text and `maxlength` attribute reflect the `maxLength` input
    when set, and update as the user types.
- `section-list-item.spec.ts`:
  - Language tags render after the question summary block, not next to the
    title (assert DOM order, not just presence — reuses existing
    `language-tag-*` test ids).
  - Country-availability line shows the "worldwide" wording when
    `availableCountries` is unset.
  - Country-availability line shows the localized, comma-separated country
    names when it's set.
- `section.service.spec.ts`: `availableCountries` round-trips unchanged
  through `create` and `saveTranslation`, and is overwritten (not merged) on
  repeated saves.
- `country.model.spec.ts`: `countryDisplayName` returns a localized,
  non-empty name for a sample of codes in both `es` and `en`; `COUNTRY_CODES`
  has no duplicates and a plausible ISO-3166-1 count.

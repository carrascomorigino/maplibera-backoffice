# Guide sections: optional question with Yes/No, Single, and Multiple choice

**Date:** 2026-08-06
**Status:** Approved
**Feature:** `src/app/features/guide/`

## Context

The `guide` feature's section form (`SectionFormDrawer`) currently edits
`title`, `slug`, `description` (Markdown), and `imageUrl`. This spec adds an
optional **question** to each section: a short quiz-style question with a
type (Yes/No, Single choice, Multiple choice), an editable list of answers
for the choice types, and special "All of the above" / "None of the above"
answer options.

## Goals

1. The section form gains an optional question field. Leaving it blank saves
   no question at all.
2. Once question text is entered, the user must pick a type: Yes/No
   question, Single choice, or Multiple choice.
3. Single choice: at least 2 answers, exactly one marked correct via radio.
4. Multiple choice: at least 3 answers, one or more marked correct via
   checkboxes.
5. Both choice types may optionally include "All of the above" and "None of
   the above" as extra, non-image special answers.
6. Each normal answer may optionally have an image; if any answer in the
   list has one, all normal answers in that list require one.
7. The sections list shows, when a question exists: its type, its text, and
   only the correct answer(s) — never the incorrect ones.
8. The drawer is responsive (no horizontal scroll) and scrolls vertically
   within itself, independent of the page behind it.
9. The Description field visibly indicates it's required.

## Non-goals

- No backend/API changes — persistence stays in `localStorage` via
  `SectionService`, which needs no logic changes (only a wider input type).
- No support for more than one question per section.
- No image upload — image URL only, consistent with the section's own
  Image URL field.
- No quiz-taking/answering UI — this is authoring only.

## 1. Data model

`src/app/features/guide/models/section.model.ts` adds:

```ts
export type QuestionType = 'yes-no' | 'single' | 'multiple';

export interface QuestionAnswer {
  text: string;
  isCorrect: boolean;
  imageUrl?: string;
}

export interface Question {
  text: string;
  type: QuestionType;
  yesNoCorrectAnswer?: 'yes' | 'no'; // only for type: 'yes-no'
  answers?: QuestionAnswer[]; // only for type: 'single' | 'multiple'
  includeAllOfTheAbove?: boolean;
  allOfTheAboveCorrect?: boolean;
  includeNoneOfTheAbove?: boolean;
  noneOfTheAboveCorrect?: boolean;
}

export interface Section {
  slug: string;
  title: string;
  description: string;
  imageUrl: string;
  status: SectionStatus;
  order: number;
  createdAt: string;
  updatedAt: string;
  question?: Question;
}
```

Special options ("All of the above" / "None of the above") are boolean
toggles, not entries in `answers`: they don't count toward the 2/3 minimum
answer count and never carry an image.

`src/app/features/guide/services/section.service.ts`:

- `SectionInput = Pick<Section, 'slug' | 'title' | 'description' | 'imageUrl' | 'question'>`
- No other changes — `create`/`update`/`publish`/`pause`/`reorder`/
  `loadFromStorage` already pass through whatever shape `Section` has.

## 2. Validation rules

Enforced entirely inside `QuestionEditor` (see below), surfaced to the
outer form via the `Validator` interface:

- `text` optional. Empty text → the control's value is `undefined` (no
  question persisted), regardless of what's in the other sub-fields.
- Once `text` is non-empty, `type` is required.
- `type: 'yes-no'` → `yesNoCorrectAnswer` (`'yes' | 'no'`) is required.
- `type: 'single'` → at least 2 answers in `answers`; every answer's `text`
  is required; exactly one of (all normal answers + both specials, among
  those included) must be marked correct.
- `type: 'multiple'` → at least 3 answers in `answers`; every answer's
  `text` is required; at least one of (all normal answers + both specials,
  among those included) must be marked correct.
- Image cross-field rule (normal answers only, both choice types): if any
  answer's `imageUrl` is non-empty, every normal answer's `imageUrl` becomes
  required.

## 3. `QuestionEditor` component

New standalone component `src/app/features/guide/components/question-editor/`
(`question-editor.ts` / `.html` / `.spec.ts`), mirroring the
`ControlValueAccessor` pattern already used by `MarkdownEditor`, and
additionally implementing Angular's `Validator` via `NG_VALIDATORS` (multi)
so `SectionFormDrawer` treats `formControlName="question"` like any other
validated control — no validation logic duplicated in the drawer.

Internal reactive form (private to the component):

- `text: FormControl<string>` — plain input.
- `type: FormControl<QuestionType | ''>` — `mat-select` with options
  "Yes/No question", "Single choice", "Multiple choice". The field is shown
  in the template only when `text` is non-empty.
- `yesNoCorrectAnswer: FormControl<'yes' | 'no' | null>` — radio group,
  shown only when `type === 'yes-no'`.
- `answers: FormArray<FormGroup<{ text, isCorrect, imageUrl }>>` — shown
  when `type` is `'single'` or `'multiple'`.
  - Each row: text input (required), optional image URL input (reuses the
    section form's `URL_PATTERN`), and a correctness control — native
    `radio` for `single`, `checkbox` for `multiple`.
  - "Add answer" button appends a row (empty text, `isCorrect: false`).
  - Each row's "Remove" button is disabled once the array length equals the
    type's minimum (2 for single, 3 for multiple).
- `includeAllOfTheAbove` / `includeNoneOfTheAbove: FormControl<boolean>` —
  checkboxes. When checked, an extra row renders in the answer list with a
  fixed label ("All of the above" / "None of the above" in English, not
  translatable) and its own radio/checkbox bound to
  `allOfTheAboveCorrect` / `noneOfTheAboveCorrect`.

Selection behavior — implemented as component methods rather than relying
on native radio grouping, since "correct" spans both the `answers` array
and the two special flags:

- **Single** — `selectCorrect(key: number | 'all' | 'none')`: sets exactly
  the targeted answer's `isCorrect` (or the matching special flag) to
  `true`, and clears every other answer's `isCorrect` and both special
  flags. No disabling of inputs — a fresh click just moves the mark.
- **Multiple** — checking a normal answer's checkbox just toggles its own
  `isCorrect`. Checking `allOfTheAboveCorrect` or `noneOfTheAboveCorrect`:
  forces the *other* special's flag to `false`, forces every normal
  answer's `isCorrect` to `false`, and disables (via `FormControl.disable()`)
  every normal answer's checkbox. Unchecking it re-enables them. At most one
  special can be marked correct at a time.

`writeValue(question: Question | undefined)` populates the internal form
(rebuilding the `answers` `FormArray` to match); `onChange` emits
`undefined` whenever `text` is empty, otherwise emits the assembled
`Question` object. `validate(control)` returns `null` when the internal
form is valid (including the "text empty → everything else is moot" case)
or `{ question: true }` otherwise, and calls the registered
`onValidatorChange` whenever the internal form's status changes so the
outer form re-evaluates promptly.

## 4. `SectionFormDrawer` integration

- Form gains `question: new FormControl<Question | undefined>(undefined)`
  (no `Validators` here — validity comes from `QuestionEditor`'s
  `Validator` implementation).
- Template: `<app-question-editor formControlName="question" />` placed
  after the Image URL field (and its preview).
- `persist()`'s destructured `getRawValue()` includes `question`, passed
  straight through to `sectionService.create`/`update`.
- The `effect()` that resets the form when `section()` changes resets
  `question` to `section?.question ?? undefined` alongside the other
  fields.
- Description label gets a visible required indicator: `Description *`
  (matching the existing `Slug`/`Title` fields, which are required but
  currently unmarked — only Description is called out explicitly per this
  request, so only its label changes).

## 5. Drawer responsiveness and scroll

`section-form-drawer.html`:

- Replace the fixed `w-96` with `w-full sm:w-[26rem] max-w-full` so the
  drawer never forces the viewport wider than it is.
- Add `min-w-0` to field wrapper elements so long unbroken content (image
  URLs, markdown toolbar) wraps instead of pushing width.
- Restructure the form into a non-scrolling flex shell: `flex h-full
  flex-col overflow-hidden` on the `<form>`. The heading + all fields
  (including the new question editor) go inside a
  `flex-1 overflow-y-auto overflow-x-hidden` region; the
  Save/Publish/Cancel button row stays outside that region as a fixed
  footer. This keeps the drawer's own content scrollable without ever
  scrolling the page behind it.

## 6. List page display

`sections-list.page.html` / `.ts`: when `section.question` exists, render
under the existing description text:

- Question type label — `Yes/No question` / `Single choice` /
  `Multiple choice`, via a small `questionTypeLabel(type)` mapper.
- The question's `text`.
- Only the correct answer(s), via a new pure helper in
  `sections-list.page.ts`:

  ```ts
  function correctAnswerLabels(question: Question): string[]
  ```

  - `yes-no` → `['Yes']` or `['No']` based on `yesNoCorrectAnswer`.
  - `single`/`multiple` → the `text` of every answer with `isCorrect:
    true`, plus `'All of the above'` if `allOfTheAboveCorrect`, plus
    `'None of the above'` if `noneOfTheAboveCorrect`.

Rendered as a small `<ul>` of correct-answer chips/text under the question
text, only when the list is non-empty.

## 7. Testing plan (TDD — specs written before implementation)

- `question-editor.spec.ts` (new):
  - Type select is hidden until `text` has a value; required once shown.
  - Yes/No: `yesNoCorrectAnswer` required to be valid.
  - Single: enforces 2-answer minimum, required text per answer, Remove
    disabled at minimum, `selectCorrect` clears all other correct flags
    (including specials).
  - Multiple: enforces 3-answer minimum; checking a special disables and
    clears normal-answer checkboxes and the other special; unchecking
    re-enables them; at least one correct required.
  - Image cross-field rule: adding an image to one answer makes the others'
    image required; clearing it back to zero images lifts the requirement.
  - CVA round-trip: `writeValue` populates the form (including rebuilding
    `answers` for an existing question), `onChange` emits `undefined` when
    `text` is cleared, emits the full `Question` otherwise.
  - `Validator.validate()` reflects the internal form's validity in both
    directions (valid → `null`, invalid → truthy error object).
- `section-form-drawer.spec.ts` (add cases):
  - Saving with empty question text omits `question` from the persisted
    section.
  - Saving with a filled-in valid question persists it unchanged.
  - Save/Publish stay disabled while the question editor is invalid.
  - Description label renders the required-indicator text.
- `sections-list.page.spec.ts` (add cases):
  - Row renders question type, text, and correct answers when a question
    exists.
  - Row renders nothing extra when it doesn't.
  - `correctAnswerLabels` covers yes-no (both answers), single, multiple,
    and the all-of-the-above/none-of-the-above cases.
- `section.service.spec.ts` (add case): `question` round-trips through
  `create` and `update` unchanged.

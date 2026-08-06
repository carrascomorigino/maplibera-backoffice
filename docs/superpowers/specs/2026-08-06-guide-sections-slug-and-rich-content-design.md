# Guide sections: slug identifier, rich content, and list affordances

**Date:** 2026-08-06
**Status:** Approved
**Feature:** `src/app/features/guide/`

## Context

The `guide` feature (sections list + drawer form) currently identifies each
`Section` with a server-generated `crypto.randomUUID()` `id`, enforces title
uniqueness, edits the description as a plain textarea, and supports
drag-and-drop reordering by dragging anywhere on the row.

This spec was meant to build on the original guide-sections design doc
referenced from `CLAUDE.md`
(`docs/superpowers/specs/2026-08-05-guide-sections-design.md`), but that file
does not exist in the repository. This document supersedes that reference
going forward — `CLAUDE.md` should be updated to point here once this ships.

## Goals

1. The module's page title reads "Guide" instead of "Sections".
2. Sections are identified by a user-entered, required, unique **slug**,
   which replaces the internal UUID `id` as the primary key.
3. The slug is visible in the sections list.
4. Title uniqueness is no longer enforced.
5. The description field becomes a rich-content (Markdown) editor instead of
   a plain textarea.
6. The list shows a placeholder thumbnail indicator when a section has no
   image.
7. Each list row has a drag handle on the left with a "move" cursor on
   hover; dragging is restricted to that handle.

## Non-goals

- No backend/API changes — persistence stays in `localStorage` via
  `SectionService`.
- No full CommonMark support — the Markdown editor only needs to round-trip
  the syntax its own toolbar produces.
- No data-migration tooling for existing `localStorage` entries — see
  "Legacy data" below.

## 1. Data model

`src/app/features/guide/models/section.model.ts` drops `id`; `slug` becomes
the identifying field:

```ts
export type SectionStatus = 'draft' | 'published' | 'paused';

export interface Section {
  slug: string;
  title: string;
  description: string;
  imageUrl: string;
  status: SectionStatus;
  order: number;
  createdAt: string;
  updatedAt: string;
}
```

## 2. `SectionService`

- `SectionInput = Pick<Section, 'slug' | 'title' | 'description' | 'imageUrl'>`
- `SectionUpdate = Partial<SectionInput>`
- `create(input)` uses `input.slug` directly instead of generating a UUID.
- `update(currentSlug, changes)` looks up the section by its **current**
  slug; `changes` may itself include a new `slug`, which renames the
  section's identity in place (order/timestamps unaffected other than
  `updatedAt`).
- `publish(slug)`, `pause(slug)`, `reorder(orderedSlugs: string[])` — same
  shape as today, keyed by slug instead of id.
- **Legacy data:** `loadFromStorage()` keeps its existing defensive
  behavior (invalid JSON → empty list) and additionally filters out any
  parsed entry whose `slug` is not a non-empty string, so pre-migration
  records (which only had `id`) silently disappear from the list rather
  than breaking rendering. This is acceptable because the app has no real
  users yet and persistence is local-only.

## 3. Slug field (form)

New utility `src/app/features/guide/utils/slugify.ts` (+ `slugify.spec.ts`):

```ts
export function slugify(value: string): string;
```

Lowercases, strips diacritics (`é` → `e`, `ñ` → `n`) via
`normalize('NFD')`, replaces runs of non `[a-z0-9]` characters with a single
hyphen, and trims leading/trailing hyphens.

In `SectionFormDrawer`:

- Slug pattern: `^[a-z0-9]+(-[a-z0-9]+)*$` (`SLUG_PATTERN`).
- `slug` `FormControl`: `Validators.required`, `Validators.pattern(SLUG_PATTERN)`,
  and a `duplicateSlugValidator` (case-insensitive, excludes the slug the
  section being edited already owns) — structurally the same validator the
  title field used to have, just moved.
- `title` `FormControl`: `Validators.required` only — the duplicate-title
  validator is removed.
- **Auto-suggest:** while the user has not yet typed into the Slug field
  directly, changes to Title auto-fill Slug via `slugify(title)` (set with
  `emitEvent: false` so it doesn't itself mark the field as manually
  edited). The first time the user edits Slug directly, auto-suggest stops
  for the rest of that session with the drawer open. Loading an existing
  section into the form (via the `section` input) does not count as a
  manual edit.

Template field order: Title, Slug, Description (rich editor), Image URL.
Slug shows a pattern error ("Use lowercase letters, numbers, and hyphens
only") and a uniqueness error ("A section with this slug already exists"),
mirroring today's title-duplicate error styling.

## 4. Rich content editor

New standalone component `src/app/features/guide/components/markdown-editor/`
(`MarkdownEditor`, files `markdown-editor.ts` / `.html` / `.spec.ts`,
matching the project's no-suffix naming convention):

- Implements `ControlValueAccessor` so `SectionFormDrawer` uses it as
  `<app-markdown-editor formControlName="description" />`, no different
  from any other reactive form control.
- Toolbar buttons: Bold, Italic, Bulleted list, Numbered list, Link,
  Heading. Each wraps/inserts the corresponding Markdown syntax into the
  underlying `<textarea>` at the current cursor/selection, then returns
  focus to the textarea.
- A "Preview" toggle swaps the textarea for a rendered read-only view,
  produced by a small hand-written renderer that covers exactly the syntax
  the toolbar can produce (headings, bold, italic, links, bulleted/numbered
  lists, paragraphs) — no third-party Markdown/WYSIWYG dependency.
- The rendered HTML is bound with `[innerHTML]` and left to Angular's
  default `DomSanitizer` sanitization (no `bypassSecurityTrustHtml`).
- Toolbar buttons carry `aria-label`s (e.g. "Bold", "Italic"); the preview
  toggle exposes its pressed state via `aria-pressed`.

## 5. List page (`sections-list.page`)

- `h1` text changes from "Sections" to **"Guide"**. The drawer's own
  "New section" / "Edit section" heading is unchanged — only the
  module-level page title changes.
- Slug is rendered under the title as small monospace text:
  `<p data-testid="section-slug">`.
- Thumbnail placeholder: when `imageUrl` is empty, the existing gray box
  now contains a centered `<mat-icon>image</mat-icon>` instead of being
  blank (`MatIconModule` added to the page's imports).
- Drag handle: a `drag_indicator` `mat-icon` at the left of each row,
  marked with `cdkDragHandle` and `data-testid="drag-handle"`, styled with
  Tailwind's `cursor-move`. `cdkDrag` stays on the `<li>`, but with a
  handle present, pointer-initiated dragging is restricted to that handle.
  The `<li>` keeps its `tabindex="0"` and descriptive `aria-label`, so
  keyboard reordering (Space to lift, arrow keys to move, Space to drop)
  is unaffected.

## 6. Testing plan (specs updated before implementation, per project convention)

- `slugify.spec.ts` (new): lowercasing, diacritic stripping, hyphenation,
  trimming edge cases.
- `section.service.spec.ts`: replace all `.id` usage with `.slug`
  throughout; add a case for renaming a section's slug via `update()`; add
  a case for legacy entries without `slug` being filtered out on load.
- `section-form-drawer.spec.ts`: remove the duplicate-title tests; add
  duplicate-slug tests (blocks case-insensitive duplicates, allows keeping
  a section's own slug); add slug pattern validation tests; add a test that
  Slug auto-fills from Title until the user edits Slug directly, and stops
  updating afterward.
- `markdown-editor.spec.ts` (new): toolbar buttons insert the expected
  Markdown syntax around a selection/cursor; Preview toggle renders
  expected HTML and sanitizes unsafe input; component satisfies
  `ControlValueAccessor` (`formControlName` read/write round-trips).
- `sections-list.page.spec.ts`: replace `.id` references with `.slug`; add
  a test asserting the slug renders per row; add a test asserting the
  placeholder icon renders when `imageUrl` is empty; add a test asserting
  the drag handle element (`data-testid="drag-handle"`) is present and
  carries `cdkDragHandle`.

## Open follow-up

Once implemented, update `CLAUDE.md`'s reference to
`2026-08-05-guide-sections-design.md` to point at this document instead
(or add this document alongside it if the original is later recovered).

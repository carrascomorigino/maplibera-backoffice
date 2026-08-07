# News & Events module (Noticias y Eventos)

**Date:** 2026-08-07
**Status:** Approved
**Feature:** `src/app/features/news/` (new), `src/app/shared/` (extended:
`markdown-editor` and `string-list-editor` promoted from `guide`/`resources`)

## Context

A new admin module, "Noticias y Eventos", manages time-sensitive content —
news items and events — meant to feel dynamic and frequently updated. Unlike
`guide` and `resources`, its listing order is not manually curated: items
are always shown most-recent-publication-first, computed from a
user-editable `publishedAt` date rather than a drag-and-drop `order` field.

The module reuses the established patterns from `guide` and `resources`:
root-provided signal services with `localStorage` persistence, per-language
`translations` maps, draft/paused/published status, AI-assisted translation
drafts, and stale-translation tracking via the shared `app-language-tags`
component.

Building this module surfaces two components that are no longer
feature-specific once a third feature needs them, and are relocated (not
duplicated) as part of this spec:

1. `markdown-editor` (currently in `guide/components/`) moves to
   `shared/components/markdown-editor/`, reused as-is for the news
   description field.
2. `string-list-editor` (currently in `resources/components/`) moves to
   `shared/components/string-list-editor/`, reused as-is for the
   `sourceLinks` field.

Both are relocations of working, already-tested code — no behavior change,
only updated import paths in `guide` and `resources`.

## Goals

1. A new lazy-loaded `news` feature, listed in the app nav, managing
   `NewsItem` entities with a `news` | `event` category.
2. Listing always sorted by `publishedAt` descending — no manual reordering,
   no drag-and-drop.
3. A single "+ Agregar" button opening a drawer where the user picks the
   category (no per-category buttons, unlike `resources`).
4. Quick filter (Todas / Noticias / Eventos) above the card grid.
5. Same draft/paused/published status lifecycle as `guide`/`resources`.
6. Same per-language `translations` + `staleLanguages` model, with
   AI-suggested first drafts and stale-translation review, reusing the
   existing generic `/api/translate` endpoint unchanged.
7. `markdown-editor` and `string-list-editor` promoted to `shared/components/`.
8. Built test-first per project convention.

## Non-goals

- No image upload/storage — `imageUrl` is a URL-only text input, same as
  `Section.imageUrl` / `Resource` image fields today.
- No full deletion — only draft/paused/published, matching `guide`/`resources`.
- No drag-and-drop reordering — order is always computed from `publishedAt`.
- No category-specific field sets — `news` and `event` share every field
  except `eventDate`, so the model is a single flat interface, not a
  discriminated union like `Resource`.
- No editing of `category` after creation — locked at creation time, same
  rule as `Resource.category`.
- No data migration — `Section`/`Resource` storage is untouched; `NewsItem`
  persists under its own `localStorage` key.

## 1. Data model

```ts
// src/app/features/news/models/news-item.model.ts
import { ContentLanguage } from '../../guide/models/content-language.model';

export type NewsCategory = 'news' | 'event';
export type NewsStatus = 'draft' | 'published' | 'paused';

export interface NewsTranslation {
  title: string;
  subtitle: string;
  description: string; // markdown, rendered via shared app-markdown-editor
}

export interface NewsItem {
  slug: string;
  category: NewsCategory; // fixed at creation, never edited afterward
  status: NewsStatus;
  imageUrl: string; // banner, shared across languages
  publishedAt: string; // ISO date (yyyy-MM-dd); drives sort order; user-editable, defaults to today
  eventDate?: string; // ISO date; only meaningful/shown when category === 'event'
  sourceLinks: string[]; // reference links/sources, shared across languages
  createdAt: string;
  updatedAt: string;
  translations: Partial<Record<ContentLanguage, NewsTranslation>>;
  /** Maps a language that needs re-syncing to the language it should translate from. */
  staleLanguages?: Partial<Record<ContentLanguage, ContentLanguage>>;
}

export const NEWS_CATEGORIES: readonly NewsCategory[] = ['news', 'event'];
```

A single flat interface, not a discriminated union: `news` and `event` items
share every field except `eventDate`, so a `Resource`-style union per
category would add structural overhead (four interfaces, a `buildResource`
switch) with no corresponding benefit here. `eventDate` stays a plain
optional field, shown in the form only when `category === 'event'`.

`ContentLanguage`/`CONTENT_LANGUAGES`/`CONTENT_LANGUAGE_LABELS` are imported
from `guide/models/content-language.model.ts`, same as `resources` does
today.

## 2. Shared component promotions

```
src/app/shared/components/
├── language-tags/         (existing)
├── markdown-editor/        (moved from guide/components/markdown-editor/)
│   ├── markdown-editor.ts
│   ├── markdown-editor.html
│   └── markdown-editor.spec.ts
└── string-list-editor/     (moved from resources/components/string-list-editor/)
    ├── string-list-editor.ts
    ├── string-list-editor.spec.ts
    └── (inline template, as today)
```

Both moves are pure relocations: component logic, the `ControlValueAccessor`
contracts, and existing specs move unchanged. Only import paths update:

- `guide/components/section-form-drawer/section-form-drawer.ts` imports
  `MarkdownEditor` from `shared/components/markdown-editor/markdown-editor`
  instead of the local path.
- `resources/components/category-fields/*-fields-form/*.ts` import
  `StringListEditor` from `shared/components/string-list-editor/string-list-editor`
  instead of the local path.
- `news/components/news-form-drawer/news-form-drawer.ts` imports both from
  `shared/components/`.

No new shared component is introduced beyond these two relocations —
`app-language-tags` is reused as-is for News' per-item language switcher.

## 3. Feature structure & `NewsItemService`

```
src/app/features/news/
├── news.routes.ts
├── models/
│   └── news-item.model.ts
├── services/
│   └── news-item.service.ts (+ .spec.ts)
├── pages/
│   └── news-list/
│       ├── news-list.page.ts
│       ├── news-list.page.html
│       └── news-list.page.spec.ts
└── components/
    ├── news-card/ (+ .spec.ts)
    └── news-form-drawer/ (+ .spec.ts)
```

`NewsItemService` (root-provided, private `signal<NewsItem[]>` +
`computed()`s), mirroring `SectionService`/`ResourceService`:

```ts
create(input: {
  category: NewsCategory;
  slug: string;
  sharedFields: { imageUrl: string; publishedAt: string; eventDate?: string; sourceLinks: string[] };
  language: ContentLanguage;
  translation: NewsTranslation;
}): NewsItem;

saveTranslation(slug: string, language: ContentLanguage, translation: NewsTranslation, newSlug?: string): void;
removeTranslation(slug: string, language: ContentLanguage): void; // guards against removing the last language, same rule as Resource
updateSharedFields(slug: string, sharedFields: { imageUrl: string; publishedAt: string; eventDate?: string; sourceLinks: string[] }): void;
publish(slug: string): void;
pause(slug: string): void;

readonly items = computed(() => /* all NewsItems, sorted by publishedAt desc, tie-broken by createdAt desc */);
```

No `order` field, no `reorder()` method — sort is always derived from
`publishedAt` inside the `items` computed, so there is nothing to persist
beyond the date itself. `staleLanguages` staling rules on `saveTranslation`
and cross-cleanup on `removeTranslation` are identical to
`ResourceService`.

## 4. Form drawer

`NewsFormDrawer` holds one `FormGroup`:

```ts
{
  category: FormControl<NewsCategory>,   // enabled only in 'create' mode; disabled in 'edit'/'translate'
  title: FormControl<string>,            // Validators.required
  subtitle: FormControl<string>,         // Validators.required
  description: FormControl<string>,      // bound to app-markdown-editor
  imageUrl: FormControl<string>,         // Validators.required + URL_PATTERN
  publishedAt: FormControl<string>,      // Validators.required, type="date", defaults to today on create
  eventDate: FormControl<string | null>, // required only when category === 'event' (conditional validator), cleared/disabled when category === 'news'
  sourceLinks: FormControl<string[]>,    // bound to app-string-list-editor
}
```

- Opened via a page-level `drawerContext` signal, same discriminated-union
  shape as `resources`' (`{mode:'create'}` | `{mode:'edit', item,
  targetLanguage, staleSourceLanguage?}` | `{mode:'translate', item,
  targetLanguage, sourceLanguage}`). Unlike `resources`, `create` carries no
  pre-selected category — the drawer's `category` select starts on `news`
  and the user can switch to `event` before saving.
- Auto-slug from `title` (`slugify()`, same manual-override tracking as
  `guide`/`resources`), `duplicateSlugValidator` scoped across all news
  items.
- Switching `category` to `event` reveals/enables the `eventDate` field and
  adds its required validator; switching back to `news` disables and clears
  it. In `edit`/`translate` mode the `category` control is disabled
  (read-only display), so this toggle only happens during `create`.
- **Splitting translated vs. shared fields on save:** `title`, `subtitle`,
  `description` go to `newsItemService.saveTranslation(slug, language, {
  title, subtitle, description })`; `imageUrl`, `publishedAt`, `eventDate`,
  `sourceLinks` go to `newsItemService.updateSharedFields(slug, {...})`.
  Same split pattern as `ResourceFormDrawer.persist()`.
- Save / Publish (new items only) / Cancel — identical semantics to
  `SectionFormDrawer`/`ResourceFormDrawer`.
- AI-suggestion and stale-review flows reuse `TranslationSuggestionService`
  from `shared/services/`, building `{ title, subtitle, description }` as
  the `fields` object — no backend changes needed, `translate-fields.ts`
  already accepts an arbitrary `Record<string, string | string[]>`.

## 5. Listing page, card, filter

**Toolbar:** one "+ Agregar" button opening the drawer in `create` mode,
plus a `mat-button-toggle-group` quick filter: `Todas | Noticias | Eventos`.

```ts
protected readonly activeFilter = signal<NewsCategory | 'all'>('all');
protected readonly visibleItems = computed(() => {
  const filter = this.activeFilter();
  const items = this.newsItemService.items(); // already sorted by publishedAt desc
  return filter === 'all' ? items : items.filter((item) => item.category === filter);
});
```

CSS grid, same responsive layout as `resources`:

```css
display: grid;
grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
gap: 1rem;
```

No `cdkDropList`/`cdkDrag` — cards render in `visibleItems()` order as-is.

**`news-card`:** banner (`imageUrl`), title, truncated subtitle, category
badge (Noticia/Evento), status badge (draft=gray, published=green,
paused=amber — same semantic colors used elsewhere), formatted
`publishedAt` (and `eventDate` when present, e.g. "Evento: 12 ago 2026"),
`app-language-tags`, edit / publish-pause actions. No drag handle.

**Status lifecycle:** identical to `guide`/`resources` — new items start
`draft`; "Publicar" in the drawer only appears for brand-new items;
afterward a Publicar/Pausar toggle lives on the card; nothing ever returns
an item to `draft`.

## 6. Navigation & routes

```ts
// app.routes.ts
{ path: 'news', loadChildren: () => import('./features/news/news.routes').then((m) => m.routes) }
```

`app.html` nav gets a third anchor, `routerLink="/news"`, labeled via
`nav.newsLink`, alongside the existing Guide and Resources links.

## 7. i18n

New `news` namespace in `Translations` (`core/i18n/models/language.model.ts`)
and both dictionaries (`en.ts`/`es.ts`), structured like the other features':
`newsList` (toolbar, filter labels, empty state, category badge labels),
`newsForm` (field labels, validation messages, category options). Reuses the
existing shared `languageTags` messages (already generalized during the
Resources build). `nav.newsLink` added alongside `nav.resourcesLink`.

## 8. Storage

`NewsItemService` persists to its own `localStorage` key
(`app-news-items`), independent of `guide`'s and `resources`' keys — no
shared storage, no migration needed.

## 9. Testing (test-first)

- `news-item.service.spec.ts`: `create`/`saveTranslation`/
  `removeTranslation` (incl. guard against removing the last
  language)/`updateSharedFields`/`publish`/`pause`/stale-marking (same
  cross-language staling rule as `ResourceService`)/sort order by
  `publishedAt` desc/localStorage defensive parsing.
- Relocated `markdown-editor.spec.ts` and `string-list-editor.spec.ts` under
  `shared/components/`: content unchanged, only import paths updated;
  re-run to confirm the move didn't break anything.
- `news-form-drawer.spec.ts`: category select enabled only in `create`,
  disabled in `edit`/`translate`; `eventDate` required + visible only when
  `category === 'event'`, cleared when switching back to `news`;
  `publishedAt` defaults to today and is required; `imageUrl` URL
  validation; AI-suggestion and stale-review flows (mirroring
  `resource-form-drawer.spec.ts`).
- `news-card.spec.ts`: category/status badges, `eventDate` shown only for
  events, language tags, edit/publish/pause action emits.
- `news-list.page.spec.ts`: filter show/hide per category, items always
  rendered in `publishedAt` descending order regardless of filter, single
  "+ Agregar" button opens the drawer in `create` mode with no
  pre-selected category, no drag-and-drop affordances present.
- Updated `section-form-drawer.spec.ts` (`guide`) and each
  `*-fields-form.spec.ts` (`resources`): import path assertions/mocks
  updated for the relocated `MarkdownEditor`/`StringListEditor`; behavior
  otherwise unchanged.

## 10. Accessibility

Status badges show text, not color alone. `eventDate` field has a visible
label distinguishing it from `publishedAt` ("Fecha del evento" vs. "Fecha de
publicación"). The category `<select>` and filter
(`mat-button-toggle-group`) are keyboard-navigable by default through
existing Material/CDK behavior. `app-language-tags` accessibility carries
over unchanged from `resources`.

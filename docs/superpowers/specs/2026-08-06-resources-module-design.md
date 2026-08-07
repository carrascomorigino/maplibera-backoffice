# Resources module (Recursos)

**Date:** 2026-08-06
**Status:** Approved
**Feature:** `src/app/features/resources/` (new), `src/app/shared/` (new,
extracted from `guide`), `src/app/features/guide/**` (dropdown replacement),
`src/server/` (translation backend generalized)

## Context

A new admin module, "Recursos", manages practical content organized into
four fixed categories: Nutrición, Recetas, Multimedia, Apps. Each category
has its own specific fields in addition to shared title/description. The
module reuses and extends patterns already established by the `guide`
feature: signal-owned root services with `localStorage` persistence,
per-language `translations` maps, draft/paused/published status, AI-assisted
translation drafts, and stale-translation tracking.

Building this module surfaces two pieces of `guide` that are no longer
feature-specific once a second feature needs them, and are extracted as part
of this spec rather than duplicated:

1. The per-item language selector, currently a native `<select>` in
   `section-list-item`, becomes a shared tag-based component
   (`app-language-tags`) used by both `guide` and `resources`, replacing the
   dropdown entirely.
2. The AI-translation backend (`translate-section.ts`, hardcoded to
   `{ title, description, question }`) is generalized to translate an
   arbitrary `Record<string, string | string[]>`, since Resources has four
   different translation shapes. `TranslationSuggestionService` and
   `StaleTranslationSuggestionCache` move from `guide/services/` to
   `shared/services/` accordingly.

## Goals

1. A new lazy-loaded `resources` feature, listed in the app nav, managing
   `Resource` entities split into four categories with category-specific
   fields, modeled as a discriminated union.
2. Quick filter by category (all / one of the four) above a CSS-grid card
   layout, cards wrapping responsively left-to-right.
3. One "add" button per category, opening a drawer with the category
   pre-selected and locked, showing only that category's fields.
4. Drag-and-drop reordering of cards, scoped per category (never mixes
   order across categories).
5. Same draft/paused/published status lifecycle as `guide` sections.
6. Same per-language `translations` + `staleLanguages` model as `guide`
   sections, with AI-suggested first drafts and stale-translation review.
7. A new shared `app-language-tags` component (gray tag = untranslated,
   colored tag = translated, ⚠ = stale, `×` removes a translation with
   confirmation) replacing the native `<select>` in both `resources` and
   `guide`.
8. Built test-first per project convention.

## Non-goals

- No real file upload/storage. All image/PDF/icon fields are URL-only text
  inputs (external links), same as `Section.imageUrl` today.
- No full resource deletion — only draft/paused/published, matching `guide`
  (which also has no delete).
- No cross-category drag-and-drop.
- No bulk "translate all languages at once" action (unchanged from `guide`).
- No data migration for existing `guide` sections — `Section`'s persisted
  shape and storage key are untouched; only the in-memory wire format of the
  AI-translation request changes.

## 1. Data model

```ts
// src/app/features/resources/models/resource.model.ts
export type ResourceCategory = 'nutrition' | 'recipes' | 'multimedia' | 'apps';
export type ResourceStatus = 'draft' | 'published' | 'paused';

interface ResourceBase {
  slug: string;
  category: ResourceCategory;
  status: ResourceStatus;
  order: number; // position within this category only, not global
  createdAt: string;
  updatedAt: string;
  staleLanguages?: Partial<Record<ContentLanguage, ContentLanguage>>;
}

export interface NutritionResource extends ResourceBase {
  category: 'nutrition';
  sourceLinks: string[]; // links to studies/sources, shared across languages
  pdfUrls: string[]; // attached PDFs, shared across languages
  translations: Partial<Record<ContentLanguage, {
    title: string;
    shortDescription: string;
    explanatoryText: string;
  }>>;
}

export interface RecipeResource extends ResourceBase {
  category: 'recipes';
  preparationMinutes: number; // shared
  photoUrls: string[]; // gallery, shared
  translations: Partial<Record<ContentLanguage, {
    title: string;
    shortDescription: string;
    ingredients: string[];
    steps: string[];
  }>>;
}

export type MultimediaType = 'documentary' | 'book' | 'podcast';
export interface MultimediaResource extends ResourceBase {
  category: 'multimedia';
  mediaType: MultimediaType; // shared
  externalUrl: string; // YouTube/Spotify/etc., shared
  posterUrl: string; // shared
  translations: Partial<Record<ContentLanguage, { title: string; shortDescription: string }>>;
}

export interface AppResource extends ResourceBase {
  category: 'apps';
  appStoreUrl?: string;
  playStoreUrl?: string;
  iconUrl: string; // shared
  translations: Partial<Record<ContentLanguage, { title: string; shortDescription: string }>>;
}

export type Resource = NutritionResource | RecipeResource | MultimediaResource | AppResource;
```

A discriminated union (not a flat interface with optional fields) so
TypeScript narrows on `category` and it's impossible to construct, say, a
`nutrition` resource with an `ingredients` field. This mirrors the
shared-metadata-vs-per-language-content split `guide` already uses, applied
per category.

`ContentLanguage`/`CONTENT_LANGUAGES`/`CONTENT_LANGUAGE_LABELS` are reused
as-is from `guide/models/content-language.model.ts` — either imported
directly or promoted to `shared/models/` (this spec keeps them where they
are, since both features can import from `guide/models/` without creating a
cycle; a follow-up can move them if a third feature needs them).

**Card thumbnail source per category:** recipes → `photoUrls[0]`,
multimedia → `posterUrl`, apps → `iconUrl`, nutrition → no image field (a
generic category icon placeholder is shown instead).

**Removing the last translation:** `app-language-tags` never renders `×` on
a tag when it is the only language with content — a resource (like a
section) can never end up with zero translations.

## 2. Shared `app-language-tags` component

```
src/app/shared/components/language-tags/
├── language-tags.ts
├── language-tags.html
└── language-tags.spec.ts
```

```ts
// inputs
languages = input.required<readonly ContentLanguage[]>();          // e.g. CONTENT_LANGUAGES
translatedLanguages = input.required<readonly ContentLanguage[]>(); // languages with content
staleLanguages = input<Partial<Record<ContentLanguage, ContentLanguage>>>({});
selectedLanguage = input.required<ContentLanguage>();

// outputs
languageSelected = output<ContentLanguage>();   // click on a translated tag's body
translateRequested = output<ContentLanguage>(); // click on a gray (untranslated) tag
languageRemoved = output<ContentLanguage>();    // click on a tag's × (never rendered for the last language)
```

Visual states:
- **Gray** (`bg-gray-100 text-gray-500`): no translation. No `×`. Click →
  `translateRequested`.
- **Colored** (`bg-blue-50 text-blue-700`): has content. Has `×` unless it's
  the last remaining language. Click on the tag body → `languageSelected`.
- **Stale**: colored + `⚠` + `aria-label` describing "needs update", same
  semantics as today's `⚠` suffix in the `<select>` options.
- **Selected**: `ring-2 ring-blue-500` on whichever tag matches
  `selectedLanguage()`.

Not a `ControlValueAccessor` — like today's `<select>`, it's a navigation/
action control emitting intent, not a form value.

**Deletion confirmation:** `app-language-tags` only emits `languageRemoved`;
it has no knowledge of dialogs. The parent (`section-list-item` /
`resource-card`) opens a `MatDialog` confirm ("¿Quitar la traducción en
{idioma}? Se perderá el contenido en ese idioma.") before calling
`sectionService.removeTranslation(...)` / `resourceService.removeTranslation(...)`.

**`removeTranslation`** is added to both `SectionService` and the new
`ResourceService` with identical logic:

```ts
removeTranslation(slug: string, language: ContentLanguage): void {
  // no-op / throws if it would remove the last remaining translation
  // deletes translations[language]
  // deletes staleLanguages[language]
  // deletes any other staleLanguages entry whose value === language (its source is gone)
}
```

**Replacement in `guide`:** `section-list-item.html`'s `<select>` plus the
separate "available languages" chip row are both replaced by one
`<app-language-tags>`. The component's existing `editRequested` /
`translateRequested` output contract is preserved (renamed/adapted to the
new component's outputs); `resetRequest`/cancel-handling in
`sections-list.page.ts` is unchanged.

## 3. Backend: generalized AI translation

```ts
// src/server/translate-fields.ts (replaces translate-section.ts)
export interface TranslateFieldsRequest {
  sourceLanguage: ContentLanguage;
  targetLanguage: ContentLanguage;
  fields: Record<string, string | string[]>;
}

export async function translateFields(
  client: GoogleGenAI,
  request: TranslateFieldsRequest,
): Promise<Record<string, string | string[]>> {
  const response = await client.models.generateContent({
    model: 'gemini-flash-latest',
    contents: JSON.stringify(request.fields),
    config: {
      systemInstruction:
        `You are a professional translator. Translate the given JSON ` +
        `object's string and string-array values from ${request.sourceLanguage} ` +
        `to ${request.targetLanguage}, preserving the exact set of keys and ` +
        `the array structure of any array values. Respond with ONLY valid ` +
        `JSON matching the input shape, no prose.`,
      responseMimeType: 'application/json',
    },
  });
  return parseTranslationResponse(request.fields, response);
}
```

`parseTranslationResponse` validates that the parsed JSON has exactly the
same keys as `request.fields` and that each value's type (`string` vs.
`string[]`) matches, instead of the old hardcoded `title`/`description`
check.

`register-translate-route.ts` keeps a single `/api/translate` route, now
passing through `{ sourceLanguage, targetLanguage, fields }` to
`translateFields`. No route changes in `src/server.ts`/`src/api-server.ts`
beyond the import rename.

**`TranslationSuggestionService`** and **`StaleTranslationSuggestionCache`**
move to `src/app/shared/services/`, retyped generically:

```ts
async suggest(
  source: { language: ContentLanguage; fields: Record<string, string | string[]> },
  targetLanguage: ContentLanguage,
): Promise<Record<string, string | string[]>>
```

`SectionFormDrawer` builds `{ title, description }` (or `{ title,
description, question: ... }` — `question` is structured, not a plain
string/string[], so it is translated separately/unchanged, excluded from
the generic `fields` call and merged back in afterward) as its `fields`
object; each `*-fields-form` in `resources` builds its own shape (e.g.
`{ title, shortDescription, ingredients, steps }` for recipes). Both cast
the generic response back to their concrete translation type after the
call — the caller owns the shape contract, the service and backend are
shape-agnostic.

## 4. Feature structure & `ResourceService`

```
src/app/features/resources/
├── resources.routes.ts
├── models/
│   └── resource.model.ts
├── services/
│   └── resource.service.ts (+ .spec.ts)
├── pages/
│   └── resources-list/
│       ├── resources-list.page.ts
│       ├── resources-list.page.html
│       └── resources-list.page.spec.ts
└── components/
    ├── resource-card/ (+ .spec.ts)
    ├── resource-form-drawer/ (+ .spec.ts)
    ├── category-fields/
    │   ├── nutrition-fields-form/ (+ .spec.ts)
    │   ├── recipe-fields-form/ (+ .spec.ts)
    │   ├── multimedia-fields-form/ (+ .spec.ts)
    │   └── app-fields-form/ (+ .spec.ts)
    └── string-list-editor/ (+ .spec.ts)

src/app/shared/
├── components/language-tags/ (+ .spec.ts)
└── services/
    ├── translation-suggestion.service.ts (+ .spec.ts)
    └── stale-translation-suggestion-cache.service.ts (+ .spec.ts)
```

`ResourceService` (root-provided, private `signal<Resource[]>` +
`computed()`s), mirroring `SectionService`:

```ts
create(category: ResourceCategory, sharedFields: ..., language: ContentLanguage, translation: ...): Resource;
saveTranslation(slug: string, language: ContentLanguage, translation: ...): void;
removeTranslation(slug: string, language: ContentLanguage): void;
updateSharedFields(slug: string, category-specific shared fields): void; // e.g. preparationMinutes, URLs
reorder(category: ResourceCategory, orderedSlugs: string[]): void;
publish(slug: string): void;
pause(slug: string): void;

readonly resources = computed(...);              // all, sorted by category then order
readonly resourcesByCategory = computed(...);     // grouped Record<ResourceCategory, Resource[]>
```

`reorder()` only rewrites `order` for slugs within the given category — it
never touches other categories' `order` values, so filtering/grouping never
needs to renumber.

**`string-list-editor`** (CVA, shared across every category-specific
sub-form that has a string-list field: `nutrition-fields-form`'s
`sourceLinks`/`pdfUrls`, `recipe-fields-form`'s `ingredients`/`steps`/
`photoUrls`. It's used identically whether the bound list is per-language
(`ingredients`, `steps`) or shared across languages (`photoUrls`,
`sourceLinks`, `pdfUrls`) — the editor itself only knows `string[]` in,
`string[]` out; which bucket the list belongs to is decided by the parent
sub-form, per §5):

```ts
value = input<string[]>([]); // via ControlValueAccessor
addButtonLabel = input.required<string>(); // e.g. "+ Agregar ingrediente"
itemPlaceholder = input<string>('');
```

Renders the list with a remove button per row and an "add" row at the
bottom; validates each entry as non-empty (and as a URL via `URL_PATTERN`
when used for link fields).

## 5. Form drawer

`ResourceFormDrawer` holds one `FormGroup`:

```ts
{
  title: FormControl<string>,           // Validators.required
  shortDescription: FormControl<string>, // Validators.required
  categoryFields: FormControl<unknown>,  // delegated to the active *-fields-form CVA
}
```

- Opened via a page-level `drawerContext` signal, same discriminated-union
  shape as `guide`'s (`{mode:'create', category}` |
  `{mode:'edit', resource, targetLanguage, staleSourceLanguage?}` |
  `{mode:'translate', resource, targetLanguage, sourceLanguage}`), plus the
  `create` variant always carries the pre-selected `category` from which
  "+ agregar" button was clicked — the drawer has no category `<select>`.
- Renders the matching `*-fields-form` via `@switch (category)`, each CVA
  wired to the `categoryFields` control.
- Auto-slug from `title` (`slugify()`, same manual-override tracking as
  `guide`), `duplicateSlugValidator` scoped across all resources
  (slugs are unique per module, not per category).

**Splitting translated vs. shared fields on save:** each `*-fields-form`'s
CVA value mixes both per-language fields (e.g. recipe's `ingredients`,
`steps`) and shared fields (e.g. recipe's `preparationMinutes`,
`photoUrls`) in one flat object, since from the form's perspective they're
all "this category's fields" — the split only matters at persistence time.
`ResourceFormDrawer.persist()` knows each category's shared-field keys
(a small fixed list per category, e.g. `['preparationMinutes',
'photoUrls']` for recipes) and partitions `categoryFields`'s value into two
calls: `resourceService.updateSharedFields(slug, sharedPart)` and
`resourceService.saveTranslation(slug, language, { title,
shortDescription, ...translatedPart })`. This mirrors the existing split in
the `Resource` model itself (§1) — shared fields live at the top level,
translated ones inside `translations[language]` — the drawer's job is just
to route the form's flat output to the right service call.

- Save / Publish (new resources only) / Cancel — identical semantics to
  `SectionFormDrawer`.
- AI-suggestion and stale-review flows reuse the shared services from §3,
  building the `fields` object appropriate to the active category.

## 6. Card grid, filter, drag-and-drop

**Toolbar:** four fixed buttons ("+ Nutrición", "+ Recetas", "+ Multimedia",
"+ Apps") opening the drawer in `create` mode with `category` locked, plus a
`mat-button-toggle-group` quick filter: `Todas | Nutrición | Recetas |
Multimedia | Apps`.

**Grouped view (filter = "Todas"):** one `<section>` per category with an
`<h2>` header, each containing its own `cdkDropList` over a CSS grid:

```css
display: grid;
grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
gap: 1rem;
```

An empty category shows a lightweight empty-state message instead of being
hidden, so its "+ agregar" toolbar button stays contextually reachable.

**Filtered view (one category):** only that category's `<section>` renders
(others behind `@if`); same grid/`cdkDropList`.

**Drag-and-drop:** `cdkDrag` per card with a drag-handle icon (as in
`guide`), `(cdkDropListDropped)` → `moveItemInArray` on that category's
slugs → `resourceService.reorder(category, orderedSlugs)`. No
`cdkDropListConnectedTo` between categories — cross-category drag is
impossible by construction, consistent with `order` being independent per
category.

**`resource-card`:** thumbnail (per §1) or category icon placeholder,
title, truncated short description, category badge, status badge
(draft=gray, published=green, paused=amber — same semantic colors used
elsewhere), `app-language-tags`, edit / publish-pause actions, drag handle.

**Status lifecycle:** identical to `guide` — new resources start `draft`;
"Publicar" in the drawer only appears for brand-new resources; afterward a
Publicar/Pausar toggle lives on the card; nothing ever returns a resource to
`draft`.

## 7. Navigation & routes

```ts
// app.routes.ts
{ path: 'resources', loadChildren: () => import('./features/resources/resources.routes').then((m) => m.routes) }
```

`app.html` nav gets a second `routerLink="/resources"` anchor next to the
existing Guide link, labeled via `nav.resourcesLink`.

## 8. i18n

New `resources` namespace in `Translations` (`core/i18n/models/
language.model.ts`) and both dictionaries (`en.ts`/`es.ts`), structured
like `guide`'s namespaces: `resourcesList` (toolbar, filter, empty states,
drag aria-labels), `resourceForm` (field labels/validation messages),
`categoryFields.nutrition|recipes|multimedia|apps` (per-category field
labels), and shared `languageTags` messages (used by both `guide` and
`resources`, since the component is shared). `nav.resourcesLink` added.

## 9. Storage & migration

`ResourceService` persists to its own `localStorage` key (e.g.
`app-resources`), independent of `guide`'s `app-guide-sections` — no shared
storage, no migration needed. The backend generalization (§3) changes only
the in-memory request/response wire format for the AI call; `Section`'s
persisted shape is untouched.

## 10. Testing (test-first)

- `resource.service.spec.ts`: `create`/`saveTranslation`/`removeTranslation`
  (incl. guard against removing the last language)/`reorder` (scoped per
  category, doesn't touch other categories)/`publish`/`pause`/stale-marking
  (same cross-language staling rule as `SectionService`)/localStorage
  defensive parsing.
- `language-tags.spec.ts`: gray/colored/stale rendering, `×` suppressed on
  the last language, `languageSelected`/`translateRequested`/
  `languageRemoved` emit correctly.
- `string-list-editor.spec.ts`: CVA add/remove/edit rows, empty-value
  filtering, URL validation mode.
- `resource-form-drawer.spec.ts` + one spec per `*-fields-form`: category
  lock on create, field-specific validators (`preparationMinutes` numeric
  and positive, URL fields via `URL_PATTERN`, non-empty list fields where
  required), AI-suggestion and stale-review flows (mirroring
  `section-form-drawer.spec.ts`).
- `resources-list.page.spec.ts`: category filter show/hide, grouped vs.
  filtered rendering, per-category drag-and-drop reorder, empty-category
  state, four "+ agregar" buttons opening the drawer with the right locked
  category.
- `translate-fields.spec.ts` (replaces `translate-section.spec.ts`):
  mocked Gemini client, key-set/type validation on the response, throws on
  mismatched keys or malformed JSON.
- `translation-suggestion.service.spec.ts` (moved + retyped): generic
  `fields` request/response round-trip via `HttpTestingController`.
- Updated `section-list-item.spec.ts` / `section-form-drawer.spec.ts` in
  `guide`: replace `<select>` interaction assertions with
  `app-language-tags` output assertions; add coverage for the new
  `removeTranslation` flow (confirmation dialog → service call → guard on
  last language).

## 11. Accessibility

Drag handles keep descriptive `aria-label`s (as in `guide`). Status badges
show text, not color alone. `app-language-tags` carries `aria-label`s for
"untranslated" and "needs update" states, matching today's `<select>`
option labels. The removal `MatDialog` gets automatic focus management from
Angular Material. The category filter (`mat-button-toggle-group`) and the
category `<select>`-free drawer are both keyboard-navigable by default
through existing Material/CDK behavior.

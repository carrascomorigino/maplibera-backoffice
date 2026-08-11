# Organizations module (Organizaciones)

**Date:** 2026-08-07
**Status:** Approved
**Feature:** `src/app/features/organizations/` (new)

## Context

A new admin module, "Organizaciones", manages a directory of organizational
links and contacts — local groups, NGOs, social networks, and specific
campaigns — each with a name, logo, geographic scope, and a fixed set of
contact links (website, Instagram, Telegram, WhatsApp, volunteer form).

The module reuses established patterns from `guide`, `resources`, and
`news`: root-provided signal services with `localStorage` persistence,
per-language `translations` maps, draft/paused/published status,
AI-assisted translation drafts, stale-translation tracking via the shared
`app-language-tags` component, and the rich-text `app-markdown-editor` with
character counters. No new shared component is introduced — everything
needed already lives in `shared/components/` after the `news` module's
promotions.

Unlike `resources` (per-category drag-and-drop, discriminated union model)
and `news` (no drag-and-drop, sorted by date), Organizations combines:
single **global** drag-and-drop ordering (like `guide`) with a **locked
type at creation** and **flat model** (like `news`, since all types share
the same fields).

## Goals

1. A new lazy-loaded `organizations` feature, listed in the app nav,
   managing `Organization` entities with a `type` of `local-group` | `ngo`
   | `social-network` | `campaign`.
2. Single flat listing, manually orderable via drag-and-drop (global
   `order`, not scoped per type).
3. A single "+ Agregar" button opening a drawer where the user picks the
   type (no per-type buttons, unlike `resources`); `type` is locked after
   creation.
4. Quick filter (Todas / Grupo local / ONG / Red social / Campaña) above
   the list. Drag-and-drop is disabled whenever the filter is not "Todas",
   since `order` is global and reordering a partial view would be
   ambiguous.
5. Form fields: name, logo (URL), description (rich text with preview and
   character counter), geographic scope (Global / País / Ciudad), and five
   named contact link fields (Sitio web, Instagram, Telegram, WhatsApp,
   Formulario de voluntariado).
6. Same draft/paused/published status lifecycle as `guide`/`resources`/`news`.
7. Same per-language `translations` + `staleLanguages` model (name,
   description translated; logo, scope, contact links shared across
   languages), with AI-suggested first drafts and stale-translation review,
   reusing the existing `/api/translate` endpoint unchanged.
8. UI labels localized via the existing `Translations` dictionaries
   (`en.ts`/`es.ts`), same as every other module.
9. Built test-first per project convention.

## Non-goals

- No real logo upload/storage — `logoUrl` is a URL-only text input, same as
  `Section.imageUrl` / `NewsItem.imageUrl`.
- No full deletion — only draft/paused/published, matching the rest of the
  app.
- No editing of `type` after creation — locked at creation time, same rule
  as `Resource.category` / `NewsItem.category`.
- No dynamic/arbitrary contact links — the five link fields are fixed and
  named, not a generic `string[]` list (unlike `sourceLinks` in
  `resources`/`news`).
- No multi-select of countries — `countryCode` holds at most one country,
  unlike `Section.availableCountries`. The existing `app-country-select`
  (multi-select, tag-based) is not reused; a single-value native `<select>`
  is used instead, sourced from the same `shared/models/country.model.ts`.
- No cross-type drag-and-drop concerns — there is only one global order,
  so this doesn't apply (contrast with `resources`' per-category order).
- No data migration — `Section`/`Resource`/`NewsItem` storage is untouched;
  `Organization` persists under its own `localStorage` key.

## 1. Data model

```ts
// src/app/features/organizations/models/organization.model.ts
import { ContentLanguage } from '../../guide/models/content-language.model';

export type OrganizationType = 'local-group' | 'ngo' | 'social-network' | 'campaign';
export type OrganizationStatus = 'draft' | 'published' | 'paused';
export type OrganizationScopeType = 'global' | 'country' | 'city';

export interface OrganizationContactLinks {
  website?: string;
  instagram?: string;
  telegram?: string;
  whatsapp?: string;
  volunteerFormUrl?: string;
}

export interface OrganizationTranslation {
  name: string;
  description: string; // markdown, rendered via shared app-markdown-editor
}

export interface Organization {
  slug: string;
  type: OrganizationType; // fixed at creation, never edited afterward
  status: OrganizationStatus;
  order: number; // global manual order, drag-and-drop
  logoUrl: string; // shared across languages, URL only
  scopeType: OrganizationScopeType;
  countryCode?: string; // ISO 3166-1 alpha-2; only meaningful when scopeType === 'country'
  city?: string; // free text; only meaningful when scopeType === 'city'
  contactLinks: OrganizationContactLinks; // shared across languages
  createdAt: string;
  updatedAt: string;
  translations: Partial<Record<ContentLanguage, OrganizationTranslation>>;
  /** Maps a language that needs re-syncing to the language it should translate from. */
  staleLanguages?: Partial<Record<ContentLanguage, ContentLanguage>>;
}

export const ORGANIZATION_TYPES: readonly OrganizationType[] = [
  'local-group',
  'ngo',
  'social-network',
  'campaign',
];
```

A single flat interface, not a discriminated union: every `OrganizationType`
shares the exact same field set, so a `Resource`-style union per type would
add structural overhead with no corresponding benefit — same reasoning as
`NewsItem`.

`ContentLanguage`/`CONTENT_LANGUAGES`/`CONTENT_LANGUAGE_LABELS` are imported
from `guide/models/content-language.model.ts`, same as `resources`/`news`.

**Scope structure:** `scopeType` drives which of `countryCode`/`city` is
meaningful. `global` uses neither; `country` uses `countryCode` only;
`city` uses `city` only. The unused field is cleared (not just hidden) when
`scopeType` changes, so stale values never linger in storage.

## 2. Field limits

```ts
// src/app/features/organizations/utils/field-limits.ts
export const NAME_MAX_LENGTH = 100;
export const DESCRIPTION_MAX_LENGTH = 1000;
```

`DESCRIPTION_MAX_LENGTH` is shorter than `guide`'s 2000 — this is a
directory blurb, not full section content.

## 3. Reused shared components (no new components introduced)

- `app-markdown-editor` (`shared/components/markdown-editor/`) for
  `description`, bound with `[maxLength]="descriptionMaxLength"`.
- `app-language-tags` (`shared/components/language-tags/`) for the
  per-item language switcher, identical usage to `resources`/`news`.
- `TranslationSuggestionService` / `StaleTranslationSuggestionCache`
  (`shared/services/`) for AI-suggested drafts and stale-translation
  review, with `fields = { name, description }`.

**Single-country selection** is *not* built as a new shared component.
`app-country-select` is multi-select (tag-based, designed for
`Section.availableCountries`) and doesn't fit a single "País" value. The
drawer instead renders a plain native `<select>` populated directly from
`shared/models/country.model.ts` (`COUNTRY_CODES` + `countryDisplayName`),
scoped locally to `organization-form-drawer` — reusing the data source
without reusing the mismatched UI component.

## 4. Feature structure & `OrganizationService`

```
src/app/features/organizations/
├── organizations.routes.ts
├── models/
│   └── organization.model.ts
├── services/
│   └── organization.service.ts (+ .spec.ts)
├── utils/
│   └── field-limits.ts
├── pages/
│   └── organizations-list/
│       ├── organizations-list.page.ts
│       ├── organizations-list.page.html
│       └── organizations-list.page.spec.ts
└── components/
    ├── organization-list-item/ (+ .spec.ts)
    └── organization-form-drawer/ (+ .spec.ts)
```

`OrganizationService` (root-provided, private `signal<Organization[]>` +
`computed()`s), mirroring `SectionService`/`NewsItemService`:

```ts
create(input: {
  type: OrganizationType;
  slug: string;
  sharedFields: {
    logoUrl: string;
    scopeType: OrganizationScopeType;
    countryCode?: string;
    city?: string;
    contactLinks: OrganizationContactLinks;
  };
  language: ContentLanguage;
  translation: OrganizationTranslation;
}): Organization;

saveTranslation(slug: string, language: ContentLanguage, translation: OrganizationTranslation, newSlug?: string): void;
removeTranslation(slug: string, language: ContentLanguage): void; // guards against removing the last language
updateSharedFields(slug: string, sharedFields: { logoUrl; scopeType; countryCode?; city?; contactLinks }): void;
reorder(orderedSlugs: string[]): void; // single global list, like SectionService.reorder
publish(slug: string): void;
pause(slug: string): void;

readonly organizations = computed(() => /* all, sorted by order asc */);
```

Staling rules on `saveTranslation` and cross-cleanup on `removeTranslation`
are identical to `SectionService`/`ResourceService`.

## 5. Form drawer

`OrganizationFormDrawer` holds one `FormGroup`:

```ts
{
  type: FormControl<OrganizationType>,          // enabled only in 'create'; disabled in 'edit'/'translate'
  name: FormControl<string>,                    // Validators.required, maxlength NAME_MAX_LENGTH
  description: FormControl<string>,             // bound to app-markdown-editor, maxLength DESCRIPTION_MAX_LENGTH
  logoUrl: FormControl<string>,                  // Validators.required + URL_PATTERN
  scopeType: FormControl<OrganizationScopeType>, // Validators.required, defaults to 'global' on create
  countryCode: FormControl<string | null>,       // required only when scopeType === 'country'
  city: FormControl<string | null>,              // required only when scopeType === 'city'
  website: FormControl<string>,                  // optional, URL_PATTERN when non-empty
  instagram: FormControl<string>,                // optional, URL_PATTERN when non-empty
  telegram: FormControl<string>,                 // optional, URL_PATTERN when non-empty
  whatsapp: FormControl<string>,                 // optional, URL_PATTERN when non-empty
  volunteerFormUrl: FormControl<string>,         // optional, URL_PATTERN when non-empty
}
```

- Opened via a page-level `drawerContext` signal, same discriminated-union
  shape as `resources`/`news` (`{mode:'create'}` | `{mode:'edit', organization,
  targetLanguage, staleSourceLanguage?}` | `{mode:'translate', organization,
  targetLanguage, sourceLanguage}`). `create` carries no pre-selected
  type — the drawer's `type` select starts on `local-group` and the user
  picks before saving, same as News' `category`.
- Auto-slug from `name` (`slugify()`, same manual-override tracking as
  `guide`/`resources`/`news`), `duplicateSlugValidator` scoped across all
  organizations.
- Switching `scopeType` enables/requires exactly one of `countryCode` /
  `city` and disables+clears the other two scope-related controls — same
  conditional-validator pattern as `NewsFormDrawer`'s `eventDate`. In
  `edit`/`translate` mode `type` is disabled (read-only display); scope can
  still be edited in `edit` mode.
- Character counters (`mat-hint`, `language.t().fieldLimits.charactersRemaining(...)`)
  on `name` and inside `app-markdown-editor` for `description`, identical
  UI convention to `section-form-drawer`.
- **Splitting translated vs. shared fields on save:** `name`, `description`
  go to `organizationService.saveTranslation(slug, language, { name,
  description })`; `logoUrl`, `scopeType`, `countryCode`, `city`,
  `contactLinks` (built from the five link controls) go to
  `organizationService.updateSharedFields(slug, {...})`. Same split
  pattern as `ResourceFormDrawer.persist()` / `NewsFormDrawer.persist()`.
- Save / Publish (new organizations only) / Cancel — identical semantics
  to `SectionFormDrawer`.
- AI-suggestion and stale-review flows reuse `TranslationSuggestionService`,
  building `{ name, description }` as the `fields` object.

## 6. Listing page, list item, filter, drag-and-drop

**Toolbar:** one "+ Agregar" button opening the drawer in `create` mode,
plus a `mat-button-toggle-group` quick filter: `Todas | Grupo local | ONG |
Red social | Campaña`.

```ts
protected readonly activeFilter = signal<OrganizationType | 'all'>('all');
protected readonly visibleOrganizations = computed(() => {
  const filter = this.activeFilter();
  const items = this.organizationService.organizations(); // already sorted by order asc
  return filter === 'all' ? items : items.filter((org) => org.type === filter);
});
```

**List (single flat list, styled like `guide`'s):**

```html
<ul
  cdkDropList
  [cdkDropListData]="visibleOrganizations()"
  [cdkDropListDisabled]="activeFilter() !== 'all'"
  (cdkDropListDropped)="onDrop($event)"
>
  @for (org of visibleOrganizations(); track org.slug) {
    <li cdkDrag [attr.aria-label]="...">
      <app-organization-list-item .../>
    </li>
  }
</ul>
```

Drag-and-drop is disabled (`cdkDropListDisabled`) whenever `activeFilter()`
is not `'all'` — `order` is a single global sequence, so reordering a
filtered subset would silently reshuffle items the user can't currently
see. The drag handle is hidden/inert in the same condition for clarity.

**`organization-list-item`:** logo (`logoUrl`) or a generic placeholder
icon, name, truncated description, type badge (Grupo local / ONG / Red
social / Campaña), status badge (draft=gray, published=green,
paused=amber), scope badge (Global / flag+país / ciudad, país — using the
same `countryDisplayName` helper as `country-select`), contact link icons
(only the ones with a non-empty value are shown, each with a descriptive
`aria-label` naming the platform), `app-language-tags`, edit /
publish-pause actions, drag handle (inert when the filter is active).

**Status lifecycle:** identical to `guide`/`resources`/`news` — new
organizations start `draft`; "Publicar" in the drawer only appears for
brand-new items; afterward a Publicar/Pausar toggle lives on the list item;
nothing ever returns an item to `draft`.

## 7. Navigation & routes

```ts
// app.routes.ts
{ path: 'organizations', loadChildren: () => import('./features/organizations/organizations.routes').then((m) => m.routes) }
```

`app.html` nav gets a fourth anchor, `routerLink="/organizations"`, labeled
via `nav.organizationsLink`, alongside Guide, Resources, and News.

## 8. i18n

New `organizations` namespace in `Translations`
(`core/i18n/models/language.model.ts`) and both dictionaries
(`en.ts`/`es.ts`), structured like the other features':
`organizationsList` (toolbar, filter labels, empty state, type/status/scope
badge labels, reorder aria-labels), `organizationForm` (field labels,
validation messages, type options, scope options, the five contact-link
labels). Reuses the existing shared `languageTags` and `fieldLimits`
messages. `nav.organizationsLink` added alongside `nav.newsLink`.

## 9. Storage

`OrganizationService` persists to its own `localStorage` key
(`app-organizations`), independent of `guide`'s, `resources`'s, and
`news`'s keys — no shared storage, no migration needed.

## 10. Testing (test-first)

- `organization.service.spec.ts`: `create`/`saveTranslation`/
  `removeTranslation` (incl. guard against removing the last
  language)/`updateSharedFields`/`reorder` (global, unscoped)/
  `publish`/`pause`/stale-marking (same cross-language staling rule as
  `SectionService`)/localStorage defensive parsing.
- `organization-form-drawer.spec.ts`: `type` select enabled only in
  `create`, disabled in `edit`/`translate`; `countryCode`/`city` required
  and visible only for their matching `scopeType`, cleared when switching
  away; `logoUrl` and each contact-link field validated via `URL_PATTERN`
  when non-empty; character counters on `name`/`description`; AI-suggestion
  and stale-review flows (mirroring `section-form-drawer.spec.ts`).
- `organization-list-item.spec.ts`: type/status/scope badges, contact-link
  icons shown only when the corresponding field has a value, language
  tags, edit/publish/pause action emits.
- `organizations-list.page.spec.ts`: filter show/hide per type, drag-and-drop
  reorder updates global `order` when filter is "Todas", `cdkDropList`
  disabled and drag handles inert when a specific type filter is active,
  single "+ Agregar" button opens the drawer in `create` mode with no
  pre-selected type.

## 11. Accessibility

Status/type/scope badges show text, not color alone. Contact link icons
carry platform-specific `aria-label`s (e.g. "Sitio web", "Instagram").
Drag handles keep descriptive `aria-label`s, and are removed from the tab
order (not just visually disabled) when reordering is unavailable. The
scope `<select>`/conditional `countryCode`/`city` fields and the type
filter (`mat-button-toggle-group`) are keyboard-navigable by default
through existing Material/CDK behavior. `app-language-tags` accessibility
carries over unchanged from `resources`/`news`.

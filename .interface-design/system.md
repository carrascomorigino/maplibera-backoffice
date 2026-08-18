# Maplibera Backoffice — Design System

## Direction & feel

"Friendly fintech admin" — sourced from mapagino.com (the consumer-facing app this
backoffice manages content for). Calm teal for trust/action, warm gold used sparingly
as an accent, a warm charcoal-navy ink instead of cold slate/gray, and a warm cream
canvas instead of stark white. Not a landing page — this is a dense CRUD admin tool
(guide sections, resources, news/events, organizations), so density and legibility
win over decoration; color stays restrained (~60/30/10: cream canvas, white cards,
teal accent).

## Palette (sampled from mapagino.com)

Sampled directly from the site: nav gradient `#41B7CB`, app icon teal `#40B0D0`,
app icon gold `#F0E030`, logo wordmark navy `#202030`, cream background `#F8F7DB`.

Defined as Tailwind v4 `@theme` tokens in [src/styles.css](../src/styles.css):

- `brand-{50..900}` — teal, primary interactive color (links, active states, primary
  actions, focus rings). Base `brand-500 = #279aa8`, text-on-white `brand-700 = #196374`.
- `gold-{50..900}` — accent, used sparingly (stale-translation preview panels,
  gradient accent bar). Base `gold-500 = #c1861b`.
- `ink-{50..900}` — warm neutral, replaces Tailwind's default `gray-*` everywhere
  (text, borders, placeholders, disabled/draft badges). `ink-900 = #17151f` echoes
  the mapagino wordmark navy.
- `surface`, `surface-card`, `surface-sunken`, `surface-muted` — warm off-white
  canvas (`#faf9f5`), white cards, sunken input fill, muted panel backgrounds.

Angular Material ([src/material-theme.scss](../src/material-theme.scss)): primary =
`mat.$cyan-palette` (closest built-in family to the brand teal), tertiary =
`mat.$yellow-palette`. System surface/outline/on-surface CSS vars are overridden
post-`mat.theme()` to match the warm ink/surface tokens above, so Material
components (buttons, dialogs, drawers, form fields) sit on the same warm world as
the Tailwind-styled parts of the app without per-component overrides.

## Depth strategy

Layered shadows (not borders-only). Cards: `rounded-xl`, `border border-ink-100`,
soft two-layer shadow, transitions to a slightly stronger shadow on hover:
```
shadow-[0_1px_2px_-1px_rgba(23,21,31,0.06),0_1px_3px_rgba(23,21,31,0.04)]
hover:shadow-[0_2px_4px_-1px_rgba(23,21,31,0.08),0_4px_8px_rgba(23,21,31,0.05)]
```
Inputs/textareas/selects: `border-ink-300`, `bg-surface-sunken` (sunken, not
lighter — signals "type here"), `focus:border-brand-500 focus:ring-2 focus:ring-brand-200`.

## Spacing & radius

Base unit 4px (Tailwind default scale), `p-6 md:p-8` for page containers, `gap-4`/`gap-6`
between major groups. Radius scale: `rounded-lg` for inputs/images/thumbnails,
`rounded-xl` for cards, `rounded-full` for pills/badges/avatars.

## Type hierarchy

Page heading: `text-2xl font-semibold tracking-tight text-ink-900`. Section heading:
`text-base font-semibold tracking-tight text-ink-800`. Body/title text: `font-medium
text-ink-900`. Secondary text: `text-sm text-ink-500`. Metadata: `text-xs text-ink-400`.

## Key component patterns

- **Badges** (status/category/type/scope pills) — `rounded-full px-2 py-1 text-xs
  font-medium`. Category/type/working-language: `bg-brand-50 text-brand-700`.
  Scope/neutral: `bg-ink-50 text-ink-600`. Status: published `bg-emerald-50
  text-emerald-700`, paused `bg-gold-100 text-gold-800`, draft `bg-ink-100 text-ink-600`.
- **Cards** (resource/news/organization/section list items) — see Depth strategy above.
  Applied via the component's `host: { class: '...' }` (per CLAUDE.md convention —
  no `@HostBinding`).
- **Empty states** — `rounded-xl border border-dashed border-ink-200 bg-surface-muted
  p-8 text-center text-sm text-ink-500`.
- **Drawer footer** (save/publish/cancel) — `border-t border-ink-100 bg-surface-muted p-6`.
- **Stale-translation preview panel** — `rounded-lg border border-gold-200 bg-gold-50 p-2`.
- **Nav active state** — do NOT use `routerLinkActive="text-brand-700 ..."` as a class
  string when the link also has a static `text-ink-600` base class: Tailwind v4's
  utility ordering doesn't reliably let a later-DOM-order class win over an
  earlier-in-stylesheet one at equal specificity. Instead expose `#x="routerLinkActive"`
  and drive `[class.text-brand-700]="x.isActive"` / `[class.text-ink-600]="!x.isActive"`
  so only one color class is ever present at a time. The active-nav underline is a
  plain (non-Tailwind) `.shadow-nav-active` class in styles.css for the same reason.

## Notes

- Tailwind v4's important modifier is a *trailing* `!` (`text-brand-700!`), not
  leading (`!text-brand-700` — that's v3 syntax and silently does nothing in v4).
- Two spec files asserted the literal string `'gray'` for the untranslated-language
  tag; updated to assert `'ink'` instead ([language-tags.spec.ts](../src/app/shared/components/language-tags/language-tags.spec.ts),
  [section-list-item.spec.ts](../src/app/features/guide/components/section-list-item/section-list-item.spec.ts)).

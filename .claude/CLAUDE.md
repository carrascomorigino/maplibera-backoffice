# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm start` (or `npx ng serve`) — dev server at http://localhost:4200 with auto-reload.
- `npm run dev:api` — runs a standalone Express API (`src/api-server.ts`, incl. `POST /api/translate`) via `tsx watch`, for local development. It shares its route handler (`src/server/register-translate-route.ts`) with the production SSR server (`src/server.ts`) but has no Angular SSR dependency itself, since `tsx` can't JIT-compile Angular's SSR engine outside the CLI build pipeline. `npm start` proxies `/api/*` to it (see `proxy.conf.json`). Requires a `.env` (copy `.env.example`) with `GEMINI_API_KEY` set to exercise the guide feature's AI-suggested translations; without it, that feature degrades to showing the untranslated source text instead of crashing — everything else in the app works with `npm start` alone.
- `npx ng build` — production build to `dist/maplibera-backoffice/`. `npx ng build --configuration development` for an unoptimized build.
- `npm test` (or `npx ng test`) — unit tests via Angular's `@angular/build:unit-test` builder, running on Vitest with jsdom. Watch mode is on by default in a TTY.
  - Run a single spec file: `npx ng test --include src/app/features/guide/services/section.service.spec.ts`
  - Filter by suite/test name: `npx ng test --filter "SectionService"`
  - Single non-watch run: `npx ng test --watch=false`
- No lint script is configured; `.prettierrc` only governs formatting (Prettier, single quotes, printWidth 100, Angular parser for `.html` templates).
- No e2e framework is set up (`ng e2e` is a no-op stub from the Angular CLI default).

## Architecture

- Angular v21, standalone components only (no NgModules), SSR-enabled: Express server in `src/server.ts`, hydration with event replay configured in `src/app/app.config.ts`. Browser entry is `src/main.ts`, server entry `src/main.server.ts`.
- Feature code lives under `src/app/features/<name>/` and is lazy-loaded from `src/app/app.routes.ts` via `loadChildren`/`loadComponent`. Each feature follows this internal layout: `models/`, `services/`, `pages/<page-name>/`, `components/<component-name>/`, `<name>.routes.ts`. `guide` (`src/app/features/guide/`) is the first feature and the reference for this structure — see [docs/superpowers/specs/2026-08-06-guide-sections-slug-and-rich-content-design.md](../docs/superpowers/specs/2026-08-06-guide-sections-slug-and-rich-content-design.md) for the design rationale behind it.
- No NgRx: each feature's root-provided service (`providedIn: 'root'`) owns a private `signal` holding its data, plus a `computed()` exposing the derived/sorted view that components read directly — components never keep a local copy of service-owned state. Persistence (currently `localStorage`, wrapped so a missing/corrupt value falls back to an empty list rather than throwing) is isolated inside the service, so swapping in an HTTP backend later means changing only that one file.
- UI stack: Angular Material (`@angular/material` + `@angular/cdk`) for components (drawers, buttons, form fields) and drag-and-drop (`cdkDropList`/`cdkDrag`), plus Tailwind CSS v4 (via `@tailwindcss/postcss`, `.postcssrc.json`) for layout/utility styling. Material theming lives in `src/material-theme.scss`, loaded before `src/styles.css` in `angular.json`'s `styles` array.
- Naming convention: all identifiers, files, folders, and route paths are in English regardless of the product's language (e.g. `guide`/`section`, never `guia`/`seccion`); user-facing UI copy may be localized separately.
- New features are built test-first (spec alongside implementation, written before the implementation) per the convention established in the guide-sections design doc above.

## Code Conventions

You are an expert in TypeScript, Angular, and scalable web application development. You write functional, maintainable, performant, and accessible code following Angular and TypeScript best practices.

### TypeScript Best Practices

- Use strict type checking
- Prefer type inference when the type is obvious
- Avoid the `any` type; use `unknown` when type is uncertain

### Angular Best Practices

- Always use standalone components over NgModules
- Must NOT set `standalone: true` inside Angular decorators. It's the default in Angular v20+.
- Use signals for state management
- Implement lazy loading for feature routes
- Do NOT use the `@HostBinding` and `@HostListener` decorators. Put host bindings inside the `host` object of the `@Component` or `@Directive` decorator instead
- Use `NgOptimizedImage` for all static images.
  - `NgOptimizedImage` does not work for inline base64 images.

### Accessibility Requirements

- It MUST pass all AXE checks.
- It MUST follow all WCAG AA minimums, including focus management, color contrast, and ARIA attributes.

### Components

- Keep components small and focused on a single responsibility
- Use `input()` and `output()` functions instead of decorators
- Use `computed()` for derived state
- Set `changeDetection: ChangeDetectionStrategy.OnPush` in `@Component` decorator
- Prefer inline templates for small components
- Prefer Reactive forms instead of Template-driven ones
- Do NOT use `ngClass`, use `class` bindings instead
- Do NOT use `ngStyle`, use `style` bindings instead
- When using external templates/styles, use paths relative to the component TS file.

### State Management

- Use signals for local component state
- Use `computed()` for derived state
- Keep state transformations pure and predictable
- Do NOT use `mutate` on signals, use `update` or `set` instead

### Templates

- Keep templates simple and avoid complex logic
- Use native control flow (`@if`, `@for`, `@switch`) instead of `*ngIf`, `*ngFor`, `*ngSwitch`
- Use the async pipe to handle observables
- Do not assume globals like (`new Date()`) are available.

### Services

- Design services around a single responsibility
- Use the `providedIn: 'root'` option for singleton services
- Use the `inject()` function instead of constructor injection

# Maplibera Backoffice

Content administration panel for the Maplibera platform, built with Angular 21 (standalone, signals, SSR), Angular Material and Tailwind CSS v4.

It manages four content modules — Guide sections, Resources, News & Events, and Organizations — each fully multilingual, with AI-assisted translation drafts powered by Google Gemini.

## Features

- **Four content modules**, lazy-loaded and independently routed:
  - **Guide sections** (`/guide/sections`) — ordered sections with rich content, an optional quiz question (yes/no, single or multiple choice) and per-country availability.
  - **Resources** (`/resources`) — a discriminated-union model with four categories: nutrition, recipes, multimedia (documentary/book/podcast) and apps, each with its own fields and drag-and-drop ordering.
  - **News & Events** (`/news`) — dated entries with subtitle, source links and an optional event date.
  - **Organizations** (`/organizations`) — a directory of local groups, NGOs, social networks and campaigns, with global/country/city scope and a fixed set of contact links.
- **Content in four languages** (`es`, `en`, `fr`, `pt`) — every item stores a `translations` map, so languages can be added one at a time.
- **AI-assisted translations** — draft a missing language from an existing one via `POST /api/translate`, backed by Gemini. Suggestions are cached per item and language until the source changes.
- **Stale-translation tracking** — editing a source language flags the translations derived from it so they can be reviewed and re-synced.
- **Draft / published / paused** status and drag-and-drop ordering across modules.
- **Bilingual UI** (Spanish/English) with a global language toggle, persisted in `localStorage` and pre-seeded from the browser locale.
- **Shared editing components** — Markdown editor with toolbar and preview, string-list editor with URL validation, country selector, language tags and confirm dialogs.
- **SSR** with hydration and event replay, served by Express.

## Getting started

### Prerequisites

- [Node.js](https://nodejs.org/) 20 or later
- npm 11+ (the project pins `npm@11.12.1` via `packageManager`)

### Install

```bash
npm install
```

### Configure

Copy the example environment file and fill in your Gemini credentials:

```bash
cp .env.example .env
```

| Variable | Required | Description |
| --- | --- | --- |
| `GEMINI_API_KEY` | For AI translations | API key from [Google AI Studio](https://aistudio.google.com/apikey). |
| `GEMINI_API_MODEL` | For AI translations | Gemini model id used by `/api/translate` (e.g. `gemini-2.5-flash`). |
| `API_PORT` | No | Port for the standalone dev API. Defaults to `4000`. |
| `PORT` | No | Port for the production SSR server. Defaults to `4000`. |

> [!NOTE]
> Without these variables the app still runs — the AI-suggestion feature simply degrades to showing the untranslated source text instead of a generated draft.

### Run

The app and the translation API run as two processes in development. In one terminal:

```bash
npm run dev:api
```

And in another:

```bash
npm start
```

Then open http://localhost:4200/. The dev server proxies `/api/*` to the API on port 4000 (see `proxy.conf.json`) and reloads on every source change.

> [!TIP]
> If you don't need AI-suggested translations, `npm start` on its own is enough — every other feature works without the API process.

## Available scripts

| Command | Description |
| --- | --- |
| `npm start` | Dev server at http://localhost:4200 with auto-reload. |
| `npm run dev:api` | Standalone Express API (`src/api-server.ts`) via `tsx watch`, exposing `POST /api/translate`. |
| `npm run build` | Production build to `dist/maplibera-backoffice/`. |
| `npm run watch` | Development build in watch mode. |
| `npm test` | Unit tests (Vitest + jsdom, watch mode in a TTY). |
| `npm run serve:ssr:maplibera-backoffice` | Serve the built SSR bundle with Node. |

Useful test variations:

```bash
npx ng test --watch=false
```

```bash
npx ng test --include src/app/features/guide/services/section.service.spec.ts
```

```bash
npx ng test --filter "SectionService"
```

## Project structure

```
src/
├── app/
│   ├── core/i18n/            UI language service, translations (es/en), language toggle
│   ├── features/
│   │   ├── guide/            Guide sections
│   │   ├── news/             News & events
│   │   ├── organizations/    Organization directory
│   │   └── resources/        Nutrition, recipes, multimedia, apps
│   ├── shared/               Reusable components, models and services
│   ├── app.routes.ts         Lazy-loaded feature routes
│   └── app.config.ts         Router, hydration, HTTP client, animations
├── server/                   Translation route + Gemini call, shared by both servers
├── api-server.ts             Standalone dev API
├── server.ts                 Production SSR + API server
└── main.ts / main.server.ts  Browser and server entry points
docs/superpowers/specs/       Design docs, one per module
```

Every feature follows the same internal layout: `models/`, `services/`, `pages/<page-name>/`, `components/<component-name>/` and `<name>.routes.ts`.

## Architecture notes

- **Standalone components only** — no NgModules; features are lazy-loaded with `loadChildren`.
- **Signals instead of NgRx** — each feature has a root-provided service owning a private `signal` plus a `computed()` view that components read directly. Components never keep their own copy of service-owned state.
- **Persistence is isolated** — data currently lives in `localStorage`, wrapped so a missing or corrupt value falls back to an empty list. Swapping in an HTTP backend means changing one file per feature.
- **Shared translation route** — `src/server/register-translate-route.ts` is mounted by both the SSR server and the standalone dev API. The dev API exists because `tsx` can't JIT-compile Angular's SSR engine outside the CLI build pipeline.
- **English identifiers** — all code, files, folders and route paths are in English (`guide`/`section`, never `guia`/`seccion`), regardless of the product's language. UI copy is localized separately.
- **Test-first** — new features are built with the spec written alongside (and before) the implementation.

Each module has an approved design document under [`docs/superpowers/specs/`](docs/superpowers/specs/) covering its data model and interaction rules.

## Additional resources

- [Angular documentation](https://angular.dev)
- [Angular Material](https://material.angular.dev)
- [Tailwind CSS](https://tailwindcss.com)
- [Google Gen AI SDK](https://googleapis.github.io/js-genai/)

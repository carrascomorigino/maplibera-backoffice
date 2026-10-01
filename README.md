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

#### Backend URL and Firebase

Everything else is configured in `src/environments/`, not in `.env`, because these values have to be
baked into the browser bundle. `environment.prod.ts` replaces `environment.ts` in production builds
via `fileReplacements` in `angular.json`.

| Field | Development | Production |
| --- | --- | --- |
| `apiBaseUrl` | The Cloud Run backend (set `/backend` to use a local backend through `proxy.conf.json`) | The Cloud Run backend |
| `firebase.*` | Web config of the `maplibera` Firebase project | Same |

The values come from the `Maplibera-backoffice` web app in the `maplibera` Firebase project. The Firebase web config is **not** a secret — it
identifies the project to Google and is visible in any browser bundle; access is enforced by the
backend verifying the ID token, not by hiding these values.

In the Firebase console, enable the **Google** provider (the only sign-in method), and add every
deployment domain under *Authentication → Settings → Authorized domains*.

#### How the frontend talks to the backend

`core/http/auth.interceptor.ts` sends `Authorization: Bearer <Firebase ID token>` on every call to
`apiBaseUrl`, and reacts to the backend's guard:

- `401` → force-refresh the token and retry once; a second `401` signs the user out.
- `403` → the account has no `role: 'admin'` claim. Not retried; the user sees a message. A claim
  added later only reaches the token after the user signs out and in again.
- `429` → the user is told to wait the number of seconds in `Retry-After`. The browser can only read
  that header if the backend's CORS config lists it in `exposedHeaders`.

The backend must list the frontend's origin in `CORS_ALLOWED_ORIGINS` (`http://localhost:4200` for
`npm start`).

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
- **Persistence is isolated** — every feature service talks to the backend over `HttpClient`; the root of those URLs is injected as `API_BASE_URL` (`src/app/core/http/api-base-url.token.ts`), so pointing at a different backend means editing one environment file, not the services. The only `localStorage` left is the UI language.
- **Auth is isolated too** — the Firebase SDK is used in exactly one file (`src/app/core/auth/firebase-auth-client.browser.ts`) behind the `FirebaseAuthClient` interface. `AuthService` holds the session as signals; `authGuard` gates every data route; `authInterceptor` attaches the ID token.
- **Shared translation route** — `src/server/register-translate-route.ts` is mounted by both the SSR server and the standalone dev API. The dev API exists because `tsx` can't JIT-compile Angular's SSR engine outside the CLI build pipeline.
- **English identifiers** — all code, files, folders and route paths are in English (`guide`/`section`, never `guia`/`seccion`), regardless of the product's language. UI copy is localized separately.
- **Test-first** — new features are built with the spec written alongside (and before) the implementation.

Each module has an approved design document under [`docs/superpowers/specs/`](docs/superpowers/specs/) covering its data model and interaction rules.

## Additional resources

- [Angular documentation](https://angular.dev)
- [Angular Material](https://material.angular.dev)
- [Tailwind CSS](https://tailwindcss.com)
- [Google Gen AI SDK](https://googleapis.github.io/js-genai/)

# CLAUDE_CONTEXT.md

Working context for AI agents (Claude Code and friends) on **maplibera-backoffice**.

- **Hand-written sections** below describe intent, product decisions and current focus. Edit them freely.
- The **auto-generated block** at the bottom is rewritten by `.hooks/update-context.js` after every commit (via `.husky/post-commit`). Do not edit it by hand.
- Coding rules live in [.claude/CLAUDE.md](.claude/CLAUDE.md) and [AGENTS.md](AGENTS.md); this file is _state_, not _rules_.

---

## Product overview

Backoffice (admin panel) for **Maplibera**: content editors manage the public app's
content through feature modules. Product-facing copy is Spanish; all code, files,
folders and route paths are English.

Content modules shipped so far:

| Module        | Route base      | Purpose                                                                |
| ------------- | --------------- | ---------------------------------------------------------------------- |
| Guide         | `guide`         | Sections and questions (rich content, slugs, country availability)     |
| Resources     | `resources`     | Category-based content (recipe, nutrition, app, multimedia field sets) |
| News & Events | `news`          | Noticias y Eventos                                                     |
| Organizations | `organizations` | Organizaciones                                                         |

## Stack

- **Angular v21**, standalone components only, signals for state, SSR enabled
  (`src/server.ts` Express + hydration with event replay in `src/app/app.config.ts`).
- **Angular Material** + **CDK** (drawers, forms, `cdkDropList` drag & drop) and
  **Tailwind CSS v4** for layout/utilities. Material theme: `src/material-theme.scss`.
- **Express 5** for the SSR server and for the standalone dev API (`src/api-server.ts`,
  run with `npm run dev:api`, proxied from `npm start` via `proxy.conf.json`).
- **Google Gemini via `@google/genai`** powers AI-suggested translations
  (`POST /api/translate`, handler shared by SSR and dev API through
  `src/server/register-translate-route.ts`). Needs `GEMINI_API_KEY` in `.env`.
- **Vitest + jsdom** through `@angular/build:unit-test`. Features are built test-first.

## State & persistence

- No NgRx. Each feature has a root-provided service owning a private `signal`, exposing
  a `computed()` view; components never keep local copies of service-owned state.
- Persistence is **`localStorage`**, isolated inside each service so swapping in an HTTP
  backend later touches one file per feature. There is **no database and no server-side
  persistence** in this repo today.

## i18n & AI translation

- Language state: `src/app/core/i18n/language.service.ts`; UI strings in
  `src/app/core/i18n/translations/{en,es}.ts` (TypeScript dictionaries, not a DB table).
- Content translations are per-entity fields edited in the feature drawers, with
  AI suggestions from `translation-suggestion.service.ts` and staleness tracking in
  `stale-translation-suggestion-cache.service.ts` (`src/app/shared/services/`).
- Without `GEMINI_API_KEY` the suggestion feature degrades to showing untranslated
  source text; nothing else in the app depends on it.

## Not present in this repo

Recorded explicitly so agents don't assume otherwise:

- No React, no SQL database / ORM, no Anthropic SDK, no Redis or caching layer.
- No device-detection module, no e2e framework, no lint script (Prettier formatting only).

## Current focus

- _(update this section as work moves)_ Last shipped: Organizations module (PR #10).
- In progress: none recorded.
- Next up: see `docs/superpowers/specs/` for the newest design spec.

## How this file stays current

```bash
node .hooks/update-context.js
```

Runs automatically from `.husky/post-commit` after each commit, rewrites only the block
below, and folds the result into that same commit with `git commit --amend`, so the
working tree is left clean. `node .hooks/update-context.js --check` exits non-zero when
the block is out of date (useful in CI).

Because the block ships inside the commit it describes, it cannot name that commit's own
hash — the amend changes it. Hence the stamp carries a date and branch only, and HEAD
appears in the commit list as **(this commit)**. Keep any new field a fixed point of the
amend, or the file will never settle.

The hook refuses to amend and simply leaves the file modified when rewriting history
would be wrong: a rebase, merge, cherry-pick, revert or bisect is in progress, HEAD is a
merge commit, HEAD already exists on a remote, or commit signing is enabled. Escape
hatches: `HUSKY=0 git commit …` skips husky entirely, `CLAUDE_CONTEXT_AMEND=1 git commit …`
regenerates without amending.

Since every commit now touches this file, merging two active branches will usually
conflict here. Never resolve it by hand — the block is generated, so take either side and
rebuild it:

```bash
git checkout --ours CLAUDE_CONTEXT.md && node .hooks/update-context.js && git add CLAUDE_CONTEXT.md
```

---

<!-- AUTO:BEGIN - generated by .hooks/update-context.js, do not edit by hand -->

_Last updated: 2026-08-20 - branch `main` - 42 commits total._

### Runtime & tooling

- Package: `maplibera-backoffice` v0.0.0 (npm@11.12.1)
- Runtime deps: 16 - dev deps: 14
- Spec files under `src/`: 37

### Runtime dependencies

- `@angular/animations` ^21.2.19
- `@angular/cdk` ^21.2.14
- `@angular/common` ^21.2.0
- `@angular/compiler` ^21.2.0
- `@angular/core` ^21.2.0
- `@angular/forms` ^21.2.0
- `@angular/material` ^21.2.14
- `@angular/platform-browser` ^21.2.0
- `@angular/platform-server` ^21.2.0
- `@angular/router` ^21.2.0
- `@angular/ssr` ^21.2.19
- `@google/genai` ^2.16.0
- `dotenv` ^17.4.2
- `express` ^5.1.0
- `rxjs` ~7.8.0
- `tslib` ^2.3.0

### npm scripts

- `npm run ng` -> `ng`
- `npm run start` -> `ng serve`
- `npm run dev:api` -> `tsx watch src/api-server.ts`
- `npm run build` -> `ng build`
- `npm run watch` -> `ng build --watch --configuration development`
- `npm run test` -> `ng test`
- `npm run serve:ssr:maplibera-backoffice` -> `node dist/maplibera-backoffice/server/server.mjs`
- `npm run prepare` -> `husky || true`

### Feature modules

| Feature | Pages | Components | Services | Specs |
| --- | --- | --- | --- | --- |
| `guide` | sections-list | 4 | 1 | 6 |
| `news` | news-list | 2 | 1 | 4 |
| `organizations` | organizations-list | 2 | 1 | 4 |
| `resources` | resources-list | 3 | 1 | 8 |

### Recent commits

- **(this commit)** 2026-08-20 - chore: updating local skills _(Gino Carrasco)_
- `b881a2f` 2026-08-20 - feat: add image upload as an alternative to pasting a URL (#16) _(Gino Carrasco Mori)_
- `f8b88ac` 2026-08-18 - feat: migrate section/resource/news/organization services off localStorage (#15) _(Gino Carrasco Mori)_
- `2a2882d` 2026-08-18 - feat(agents): add project subagents and accessibility skill (#14) _(Gino Carrasco Mori)_
- `1ebd194` 2026-08-17 - feat(ui): modernize backoffice UI with mapagino.com palette (#13) _(Gino Carrasco Mori)_
- `d879089` 2026-08-17 - chore(context): CLAUDE_CONTEXT.md + .claude-resume.md auto-updated per commit (#12) _(Gino Carrasco Mori)_
- `0bb8c07` 2026-08-17 - Merge pull request #11 from carrascomorigino/docs/update-readme _(Gino Carrasco Mori)_
- `36a61b4` 2026-08-17 - chore: mirror create-readme skill under .claude/skills _(Gino Carrasco)_
- `e57cdaf` 2026-08-17 - chore: install create-readme skill _(Gino Carrasco)_
- `eface2e` 2026-08-17 - docs: rewrite README and document GEMINI_API_MODEL _(Gino Carrasco)_
- `fd9d40c` 2026-08-10 - Merge pull request #10 from carrascomorigino/feat/organizations-module _(carrascomorigino)_
- `d92436a` 2026-08-10 - feat(organizations): add Organizaciones module _(Gino Carrasco)_

### Files touched by the last commit

- `.agents/skills/angular-developer/SKILL.md`
- `.agents/skills/angular-developer/references/angular-aria.md`
- `.agents/skills/angular-developer/references/define-routes.md`
- `.agents/skills/angular-developer/references/effects.md`
- `.agents/skills/angular-developer/references/loading-strategies.md`
- `.agents/skills/angular-developer/references/mcp.md`
- `.agents/skills/angular-developer/references/naming-conventions.md`
- `.agents/skills/angular-developer/references/pipes.md`
- `.agents/skills/angular-developer/references/router-testing.md`
- `.agents/skills/brainstorming/SKILL.md`
- `.agents/skills/brainstorming/visual-companion.md`
- `.agents/skills/developing-genkit-js/SKILL.md`
- `.agents/skills/developing-genkit-js/references/docs-and-cli.md`
- `.claude/skills/angular-developer/SKILL.md`
- `.claude/skills/angular-developer/references/angular-aria.md`
- `.claude/skills/angular-developer/references/define-routes.md`
- `.claude/skills/angular-developer/references/effects.md`
- `.claude/skills/angular-developer/references/loading-strategies.md`
- `.claude/skills/angular-developer/references/mcp.md`
- `.claude/skills/angular-developer/references/naming-conventions.md`
- _...and 24 more file(s)._

### Design specs

- [2026-08-07-organizations-module-design.md](docs/superpowers/specs/2026-08-07-organizations-module-design.md)
- [2026-08-07-news-events-module-design.md](docs/superpowers/specs/2026-08-07-news-events-module-design.md)
- [2026-08-07-guide-question-detail-linked-section-country-availability-design.md](docs/superpowers/specs/2026-08-07-guide-question-detail-linked-section-country-availability-design.md)
- [2026-08-06-resources-module-design.md](docs/superpowers/specs/2026-08-06-resources-module-design.md)
- [2026-08-06-guide-sections-slug-and-rich-content-design.md](docs/superpowers/specs/2026-08-06-guide-sections-slug-and-rich-content-design.md)
- [2026-08-06-guide-section-question-design.md](docs/superpowers/specs/2026-08-06-guide-section-question-design.md)
- [2026-08-06-guide-content-translations-design.md](docs/superpowers/specs/2026-08-06-guide-content-translations-design.md)
- [2026-08-06-global-language-selector-i18n-design.md](docs/superpowers/specs/2026-08-06-global-language-selector-i18n-design.md)

<!-- AUTO:END -->

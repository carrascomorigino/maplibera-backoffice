# Work Log

A reverse-chronological log of decisions and completed work, for AI agents (and humans) picking this
project back up in a new session. `.claude/CLAUDE.md` documents the stable architecture;
[`.claude-resume.md`](../.claude-resume.md) (auto-regenerated on every commit) covers *what just
happened*; this file covers *why* — across many sessions, not just the last one.

**Maintenance rule for agents:** when you finish a meaningful piece of work (a merged PR, a fixed bug,
a non-obvious decision), add an entry at the top of the list below, in the same format as the existing
ones. Keep entries short — link the PR/commit for the diff itself, and use the entry for the *why* and
any follow-ups, not a restatement of the diff. Don't log routine/uncommitted exploration.

---

## 2026-08-29 — Firebase Auth, token interceptor, and a real production backend URL

The starting request was "replace localStorage with HTTP calls". That part was already done in
`f8b88ac` (PR #15) — but `README.md` and `CLAUDE_CONTEXT.md` still claimed otherwise, which is what
made the premise look true. Both are corrected now. The work that actually remained was the other
half of "integrated": nothing pointed at the deployed backend, and nothing authenticated.

**Why the base URL needed a token.** `/backend` only ever resolved through `proxy.conf.json`, so a
production build emitted requests nobody served. Rather than hardcode an origin, the root of every
backend URL is now `API_BASE_URL`, fed by `src/environments/` and swapped at build time by
`fileReplacements`. Because the dev environment keeps `/backend`, all five service specs kept
passing untouched — a deliberate check that the seam was in the right place.

**Why Firebase sits behind an interface.** `firebase/auth` is used in exactly one file
(`core/auth/firebase-auth-client.browser.ts`), behind the `FirebaseAuthClient` interface. This keeps
the SSR path from calling into a browser-only SDK, and it means the specs use a plain fake
(`core/auth/testing/`) in the same style as the existing `fake-*-service` doubles, instead of
depending on Vitest module mocking working under the Angular unit-test builder.

**Why a guard rather than reworking the services.** All five services `refresh()` in their
constructor. With auth that would fire unauthenticated. `authGuard` awaits `AuthService.whenReady()`
before activating any data route, so a service is only ever constructed once Firebase has resolved
the session — no token race, and zero changes to the five services' lifecycle. Awaiting readiness is
also what stops a hard refresh from bouncing a signed-in user to `/login`.

**Two consequences worth knowing.** SSR routes moved from `RenderMode.Prerender` to
`RenderMode.Client`: there is no session and no token on the server, so prerendering could only
produce an empty shell or unauthenticated fetches. And the initial bundle grew ~120 kB from the
Firebase SDK, so the `initial` budget warning went from 500 kB to 700 kB — the SDK is on the critical
path because the guard needs it before the first navigation, so lazy-loading it would buy nothing.

**Follow-up:** the backend does not verify the token yet. The frontend already sends it and already
treats a 401 as "refresh once, then sign out". The contract `maplibera-backend` needs to implement is
written down in the README under *What the backend must implement*. The environment files also still
carry placeholder values (`BACKEND_BASE_URL`, `FIREBASE_API_KEY`, …).

**Update 2026-10-01.** The backend now enforces auth (writes need `role: 'admin'`), so a `403` means
"not an admin", not "expired token": it is no longer retried, the user gets a snackbar instead. `429`
shows the `Retry-After` wait. Both environments point at the Cloud Run backend; `apiKey`/`appId` stay
placeholders because the `maplibera` project had no Firebase web app yet. The backend's CORS config
has no `exposedHeaders`, so the browser cannot read `Retry-After` until it adds it — the UI falls
back to a generic "wait a moment" message.

## 2026-08-24 — `WORK_LOG.md` added, alongside the existing resume/hook mechanism

This repo already had a mature automated continuity system —
[`.claude-resume.md`](../.claude-resume.md) + [`CLAUDE_CONTEXT.md`](../CLAUDE_CONTEXT.md),
regenerated on every commit via `.hooks/update-context.js` + `.husky/post-commit`, auto-injected into
every new session via the `SessionStart` hook in `.claude/settings.json` — but nothing that
accumulates *history*: those two files regenerate in place each commit, so they only ever describe
the latest one. This file fills that specific gap; it doesn't replace the resume mechanism, which
keeps working exactly as before. The same mechanism was ported from this repo into the sibling
`maplibera-backend` and `maplibera` repos, which conversely already had a `WORK_LOG.md` but no
automated resume file — all three repos now have both.

**Deliberately not backfilled with reconstructed history** for the ~10 commits already in this repo
before this entry (`feat(agents): add project subagents and accessibility skill` through
`fix: send undefined instead of empty string for optional videoUrl`, PRs #14–#22) — only the commit
*subjects* are available from `git log`, not the actual reasoning behind each decision, and inventing
a "why" narrative without real evidence would defeat this file's purpose. For anything before this
entry, check `git log` and the linked GitHub PRs directly — this repo's commits are already
consistently PR-numbered and reasonably descriptive.

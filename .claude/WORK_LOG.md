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

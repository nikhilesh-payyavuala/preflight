# Plan Schema

Every plan is a directory at `~/.preflight/plans/<slug>/` containing two files.

## File Structure

```
~/.preflight/plans/auth-migration-oauth2/
├── plan.md      # Human and agent readable content
└── meta.yml     # Machine-readable metadata
```

## plan.md

Five sections in reading order — humans read top to bottom and stop before Implementation. Agents read everything.

```markdown
## Context

Why we're doing this. What problem it solves. Design decisions and tradeoffs.
Links to relevant docs, prior art, or related plans. Written for a human
who needs to understand intent without reading implementation details.

## Goals

Users can authenticate via OAuth2 providers (Google, GitHub).
Existing session-based auth continues to work during migration.
Zero downtime — rolling migration with feature flag.
p99 latency stays under 200ms.

## Reviews

Appended by `pf update --review`. Do not write here manually — the CLI manages format.

## Verification

Concrete commands the executing agent runs after finishing:
- `bun test src/auth/` — all 12 tests pass
- `curl -I localhost:3000/auth/google` — 302 redirect

## Implementation

### Step 1: Title

**Files:** `src/auth/oauth.ts` (create), `src/config/auth.ts` (modify)

Prose instructions specific enough for an agent with no prior context to execute.
Name exact files, library choices, patterns to follow.
```

### Section Rules

- **Context** and **Goals** are human-optimized. Write them as if the reader has 30 seconds.
- **Reviews** are append-only. `pf update <slug> --review "<text>" --by <name>` handles formatting.
- **Verification** must be real runnable commands, not prose. Every command should have an expected output.
- **Implementation** steps should be granular enough to be atomic. A step that touches more than 3 files is probably too large.
- All sections are optional except **Implementation**. A plan with no Implementation has nothing to execute.

### `pf show --brief`

Truncates output before `## Implementation`. Used by agents doing a quick plan lookup and by humans reviewing before approval.

---

## meta.yml

```yaml
slug: auth-migration-oauth2
title: Auth Migration to OAuth2
status: draft
created: 2026-03-15T10:30:00Z
updated: 2026-03-15T14:22:00Z
author: claude
repos:
  - /Users/panik/api
  - /Users/panik/frontend
tags: [auth, migration, security]
prs:
  - repo: /Users/panik/api
    number: 123
depends-on: []
```

### Status Lifecycle

```
draft → in-review → approved → executing → completed → archived
                  ↘ rejected → draft (if revised)
```

- `draft` — created, not yet ready for review
- `in-review` — submitted, waiting for agent or human review
- `approved` — reviewed and approved, ready to execute
- `executing` — agent is currently implementing
- `completed` — done, linked to PRs
- `archived` — no longer relevant
- `rejected` — reviewed and rejected; plan goes back to `draft` if revised

### PR Linking

PRs are scoped to repos because a plan can span multiple repos and PR numbers are per-repo:

```yaml
prs:
  - repo: /Users/panik/api
    number: 45
  - repo: /Users/panik/frontend
    number: 12
```

Use `pf update <slug> --add-pr <number>` to append. The CLI auto-detects the current git repo.

---

## Slug Conventions

- Lowercase letters, numbers, hyphens only: `auth-migration-oauth2`
- Descriptive, not sequential: `fix-websocket-reconnect` not `plan-42`
- Stable — slugs become directory names and should not change after creation

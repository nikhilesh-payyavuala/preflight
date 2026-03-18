# Preflight

The missing infrastructure for AI coding plans — create, search, review, and execute plans across any agent or IDE.

## The Problem

The "plan first, execute second" workflow is how serious agentic coding works in 2025-2026. But the tooling around plans is broken:

- **Plans are siloed per tool.** Claude Code stores plans in `~/.claude/plans/`, Cursor has its own flow, Codex plans live in sandboxes. No interoperability.
- **Plans have no team workflow.** No way to share a plan for review before an agent starts coding. Code reviews happen after thousands of lines are written — too late to course-correct.
- **Plans are not searchable.** That auth migration plan from 3 weeks ago? Good luck finding it.
- **Plans aren't dual-audience.** They're either human-oriented PRDs or agent-oriented task lists. Nobody serves both.

## Quick Start

```bash
# Install
bun install -g  # from repo root, or: bun link

# Initialize
pf init

# Create a plan
pf new auth-migration --title "Auth Migration to OAuth2" --tags auth,migration

# Browse plans interactively
pf search

# Show a plan
pf show auth-migration --brief
```

## Plan Format

Every plan lives at `~/.preflight/plans/<slug>/` with two files:

**`plan.md`** — five sections, human-readable at the top, agent-executable at the bottom:

```markdown
## Context
Why we're doing this. Design decisions. Tradeoffs.

## Goals
Users can authenticate via OAuth2 providers (Google, GitHub).
Existing session-based auth continues to work during migration.
Zero downtime — rolling migration with feature flag.

## Reviews
**2026-03-15 — claude:** APPROVE. Consider rate limiting on callback.
**2026-03-16 — nik:** Ship it.

## Verification
- `bun test src/auth/` — all tests pass
- `curl -I localhost:3000/auth/google` — 302 redirect

## Implementation
### Step 1: Add OAuth2 dependency
**Files:** `src/auth/oauth.ts` (create)
...
```

**`meta.yml`** — machine-readable metadata:

```yaml
slug: auth-migration
title: Auth Migration to OAuth2
status: approved
owner: nik
parent: null
children: [auth-oauth2-api, auth-oauth2-frontend]
repos: [/Users/nik/api]
tags: [auth, migration]
```

## CLI Commands

| Command | Purpose |
|---------|---------|
| `pf init` | Set up `~/.preflight/` |
| `pf new [slug]` | Create a plan (interactive if no args) |
| `pf search [query]` | List/search plans with `--status`, `--repo`, `--tag`, `--owner` filters |
| `pf show [slug]` | View a plan. `--brief` hides Implementation, `--meta` shows metadata |
| `pf edit [slug]` | Open `plan.md` in `$EDITOR` |
| `pf update [slug]` | Change status, tags, repos, owner. Append reviews with `--review` |
| `pf delete [slug]` | Remove a plan |
| `pf install-skills` | Install Preflight skills into Claude Code, Cursor, Codex, and 40+ agents |

All commands with `[slug]` launch an fzf picker when slug is omitted.

## Plan Hierarchy

Specs can have child plans — one architecture decision, multiple implementation plans:

```bash
# Create a parent spec
pf new auth-migration --title "Auth Migration" --owner nik

# Create child plans owned by different people
pf new auth-api --title "OAuth2 API" --parent auth-migration --owner alice
pf new auth-frontend --title "OAuth2 Frontend" --parent auth-migration --owner bob

# See the full hierarchy
pf show auth-migration --meta
```

## Agent Skills

Preflight ships four skills that teach AI agents how to use the CLI:

- **preflight-create-plan** — investigate, scaffold, write, submit for review
- **preflight-search-plans** — search before creating, find prior context
- **preflight-review-plan** — evaluate completeness, correctness, risk
- **preflight-execute-plan** — follow steps exactly, run verification, link PRs

Install to all detected IDEs:

```bash
pf install-skills
```

## Design Principles

1. **Plans are markdown.** Always. `cat plan.md` just works.
2. **Local-first.** Everything works offline. No accounts, no cloud.
3. **Git-native.** History is git history.
4. **Agent-agnostic.** Works with Claude Code, Cursor, Codex, Gemini CLI, or anything that accepts markdown.
5. **Dual-audience.** Human context at the top, agent instructions at the bottom.
6. **Lightweight for solo, powerful for teams.** `pf new && pf show` is all a solo dev needs.

## Docs

- [Architecture](docs/architecture.md) — system design and key decisions
- [Plan Schema](docs/plan-schema.md) — format spec, status lifecycle, slug conventions
- [CLI Reference](docs/cli-reference.md) — every command and flag
- [Skills](docs/skills.md) — agent skill format and installation
- [Search](docs/search.md) — FTS5 design and roadmap

## License

MIT

# Architecture

## Overview

Preflight has three interfaces over one store:

```
Agent (via skill)  ──┐
                     ├──▶  pf CLI  ──▶  ~/.preflight/  (store)
Human (terminal)   ──┤
Browser (web UI)   ──┘
```

- **Skills** (`skills/`) are markdown files loaded by Claude Code. They tell agents when and how to call the CLI.
- **CLI** (`src/cli/`) is the only thing that reads and writes `~/.preflight/`. It's the single point of truth for plan lifecycle.
- **Web UI** (`src/web/`) is a read-only dashboard served by `pf serve`.
- **Store** (`~/.preflight/`) is a flat filesystem of plan directories + a SQLite index.

## Source Layers

```
src/types/index.ts          Types: PlanMeta, Plan, PlanStatus
src/core/store.ts           Path constants + listSlugs
src/core/meta.ts            Read/write meta.yml (yaml package)
src/core/db.ts              SQLite FTS5 index
src/cli/commands/*.ts       One module per CLI command (8 commands)
src/cli/index.ts            Commander wiring
src/tui/                    Ink-based TUI (pf show without slug)
src/web/                    React web dashboard (pf serve)
```

The dependency direction is strict: `cli → core → types`. No circular deps.

## CLI Commands (8)

| Command | Purpose |
|---------|---------|
| `pf init` | Setup store |
| `pf new` | Create plan |
| `pf search [query]` | List/search plans |
| `pf show [slug]` | View plan (TUI if no slug) |
| `pf edit` | Open in $EDITOR |
| `pf update` | All mutations (status, tags, repos, PRs, reviews) |
| `pf delete` | Remove plan |
| `pf serve` | Web dashboard |

## Store Layout

```
~/.preflight/
├── config.yml              Global config (editor, default_author)
├── index.db                SQLite FTS5 index (derived — safe to delete)
└── plans/
    └── <slug>/
        ├── plan.md         Plan content (agent writes this)
        └── meta.yml        Metadata (CLI manages this)
```

The store location is controlled by `PREFLIGHT_HOME` env var, falling back to `$HOME/.preflight`. This allows test isolation.

## Key Design Decisions

### Plans are global, not per-repo

`~/.preflight/` is a single cross-project store. Plans associate with repos via `meta.yml`'s `repos: []` list, not via directory hierarchy. This enables:
- Plans that span multiple repos (common for full-stack features)
- Cross-project search (`pf search "rate limiting"` finds plans from all projects)
- `pf search --repo .` to filter to the current repo

### meta.yml is separate from plan.md

Agents write `plan.md`. The CLI manages `meta.yml`. This separation means:
- `plan.md` is always clean, readable markdown — `cat plan.md` just works
- Status transitions, PR linking, and timestamp updates don't require parsing/modifying markdown
- The CLI can update metadata atomically without risking plan content corruption

### The index is derived

`~/.preflight/index.db` is rebuilt from the filesystem. It is never the source of truth. Any command that modifies a plan calls `indexPlan()` after writing to disk. If the index gets out of sync, `pf init` (or any `pf search`) rebuilds it via `rebuildIndex()`.

### No execution logic in the CLI

The CLI manages plan artifacts — it creates, reads, updates, and indexes plans. It does not execute plans. Execution is the skill's responsibility: the `preflight:execute-plan` skill reads an approved plan and follows the Implementation steps.

## Skills Architecture

Skills live in `skills/<name>/SKILL.md`. They are symlinked into `~/.claude/skills/` and `~/.agents/skills/` for Claude Code to discover. The four skills map to the plan lifecycle:

| Skill | Triggers | Key CLI calls |
|---|---|---|
| `preflight-search-plans` | Before starting any task | `pf search`, `pf show` |
| `preflight-create-plan` | Starting a new feature/task | `pf new`, writes `plan.md`, `pf update --status in-review` |
| `preflight-review-plan` | Asked to review a plan | `pf show`, `pf update --review`, `pf update --status approved/draft` |
| `preflight-execute-plan` | Implementing an approved plan | `pf show`, `pf update --status executing/completed`, `pf update --add-pr` |

## Search Architecture

Two-layer search:

1. **FTS5 (BM25)** in `index.db` — keyword relevance across `plan.md` content, titles, tags
2. **`plans_meta` table** — structured metadata for status/repo/tag filtering

See [search.md](search.md) for the full design and roadmap.

## Bun-specific Notes

- `bun:sqlite` is used for the index. Bun's SQLite **does not support `loadExtension`** — this blocks `sqlite-vec` for vector search.
- `Bun.file()` / `Bun.write()` for file I/O in `meta.ts` and `new.ts`
- `Bun.$` for shell commands in `edit.ts` and `update.ts`
- `Bun.serve()` for the web dashboard in `serve.ts`

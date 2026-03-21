# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

Preflight is a CLI tool (`pf`) for managing AI coding plans as first-class artifacts. Plans live in `~/.preflight/plans/<slug>/` — one directory per plan containing `plan.md` (human/agent-readable content) and `meta.yml` (machine-readable metadata). The CLI is the human-facing interface; skills in `skills/` are the agent-facing interface.

## CLI Commands (8 total)

| Command | Purpose |
|---------|---------|
| `pf init` | Setup `~/.preflight/` |
| `pf new <slug>` | Create a new plan |
| `pf search [query]` | List all plans or FTS search. Filters: `--status`, `--repo`, `--tag` |
| `pf show [slug]` | No slug = interactive TUI. With slug = print plan. `--brief`, `--meta`, `--json` |
| `pf edit [slug]` | Open plan.md in $EDITOR |
| `pf update [slug]` | All mutations: `--status`, `--add-tag`, `--add-repo`, `--add-pr`, `--review` |
| `pf delete [slug]` | Remove a plan |
| `pf serve` | Web dashboard on localhost |

## Running

```bash
bun src/cli/index.ts <command>   # Run CLI directly
pf <command>                      # If ~/.local/bin/pf wrapper is installed
bun test                          # Run tests
bun install                       # Install dependencies
```

## Docs

| Document | Contents |
|----------|----------|
| [docs/architecture.md](docs/architecture.md) | System design, layer diagram, key design decisions, Bun-specific notes |
| [docs/plan-schema.md](docs/plan-schema.md) | plan.md section spec, meta.yml fields, status lifecycle, slug conventions |
| [docs/skills.md](docs/skills.md) | The four agent skills, how to install them, skill format, relationship to CLI |
| [docs/search.md](docs/search.md) | FTS5 schema, why QMD was rejected, search roadmap (unified filtering, embeddings) |
| [docs/cli-reference.md](docs/cli-reference.md) | Every command, every flag, environment variables |

## Known Issues (v0.2)

- `pf search --status/--repo/--tag` filters not yet joined into the FTS query
- `pf new` doesn't auto-detect the current git repo on error

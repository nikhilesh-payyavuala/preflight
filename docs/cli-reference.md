# CLI Reference

The CLI binary is `pf`. All commands read/write `~/.preflight/` (or `$PREFLIGHT_HOME` if set).

## Commands (8 total)

### Setup

```bash
pf init    # Required first-time setup — creates ~/.preflight/, config.yml, index.db
```

### Create & Modify

```bash
pf new <slug> --title "<title>" [--repo <path>] [--tags <a,b,c>] [--author <name>]
```
Scaffolds `~/.preflight/plans/<slug>/plan.md` (template) and `meta.yml`. Slug must match `[a-z0-9-]+`.

```bash
pf update <slug> [--status <status>] [--title <title>]
                 [--add-repo <path>] [--remove-repo <path>]
                 [--add-tag <tag>]   [--remove-tag <tag>]
                 [--add-pr <number>]
                 [--review <text>] [--by <name>]
```
All mutations in one command. Valid statuses: `draft`, `in-review`, `approved`, `executing`, `completed`, `archived`, `rejected`. `--review` appends a timestamped review entry to `plan.md`. `--add-pr` links a PR (auto-detects current git repo).

```bash
pf delete <slug> [-f]   # Removes plan directory. Prompts for confirmation unless -f.
```

### Read & Browse

```bash
pf search [query] [--status <status>] [--repo <path>] [--tag <tag>] [--plain] [--json]
```
No query = list all plans (with optional filters). With query = FTS5 keyword search. Interactive fzf picker in TTY mode, plain output with `--plain` or when piped.

```bash
pf show [slug] [--brief] [--meta] [--json]
```
No slug = launch interactive TUI (Ink). With slug = print plan to terminal. `--brief` truncates before `## Implementation`. `--meta` shows metadata only (status, repos, tags, PRs). `--json` returns `{ meta, content }`.

```bash
pf edit <slug>
```
Opens `plan.md` in `$EDITOR`.

### Web

```bash
pf serve [--port 3456]
```
Starts a web dashboard on localhost. Read-only browser UI for searching and viewing plans.

## Flags Common to Read Commands

| Flag | Effect |
|------|--------|
| `--json` | Machine-readable output. Use in agent contexts. |
| `--brief` | (`show` only) Hides Implementation section |
| `--meta` | (`show` only) Metadata only |
| `--plain` | (`search` only) Non-interactive output |
| `--repo .` | Resolves `.` to current git root via `git rev-parse --show-toplevel` |

## Environment Variables

| Variable | Default | Effect |
|----------|---------|--------|
| `PREFLIGHT_HOME` | `$HOME` | Changes store root. `~/.preflight/` becomes `$PREFLIGHT_HOME/.preflight/`. Useful for test isolation. |
| `EDITOR` / `VISUAL` | `vi` | Editor for `pf edit` |

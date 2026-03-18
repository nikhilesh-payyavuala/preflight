# Preflight CLI Reference (for agents)

All commands require explicit arguments. No command prompts interactively.
`pf show` is the only interactive command (for humans) — agents use `pf show <slug> --json` or `--meta`.

## Commands

### pf init
Initialize `~/.preflight/`. Run once.

### pf new
```bash
pf new <slug> --title "<title>" [--repo <path>] [--tags <a,b,c>] [--author <name>] [--owner <name>] [--parent <slug>]
```
- Slug: lowercase, hyphens only (`auth-migration-oauth2`)
- `--repo`: associate with a repo (use `$(git rev-parse --show-toplevel)` for current)
- `--parent`: create as a child of another plan
- `--owner`: human responsible for this plan

### pf update
```bash
pf update <slug> [options]
```
Options:
- `--status <status>` — draft, in-review, approved, executing, completed, archived, rejected
- `--title <title>` — change title
- `--owner <name>` — set human owner
- `--add-repo <path>` / `--remove-repo <path>` — manage repo associations
- `--add-tag <tag>` / `--remove-tag <tag>` — manage tags
- `--add-pr <number>` — link a PR (auto-detects current repo)
- `--review "<text>" --by <name>` — append a timestamped review to plan.md
- `--complete-step <N>` — mark implementation step N as completed
- `--start-step <N>` — mark step N as in-progress
- `--sync-steps` — re-extract steps from plan.md headings

### pf search
```bash
pf search [query] [--status <s>] [--repo <path>] [--tag <t>] [--owner <name>] [--json]
```
- No query: list all plans
- With query: FTS keyword search
- `--repo .`: filter to current repo
- `--json`: structured output

### pf show
```bash
pf show <slug> [--brief] [--meta] [--json]
```
- `--brief`: stop before `## Implementation` (context + goals + reviews only)
- `--meta`: metadata only (status, repos, tags, steps, parent, children)
- `--json`: structured output (`{ meta, content }`)

Without `--json` or `--meta`, outputs rendered markdown to stdout.

### pf edit
```bash
pf edit <slug>
```
Opens `~/.preflight/plans/<slug>/plan.md` in `$EDITOR`.

### pf delete
```bash
pf delete <slug> -f
```
Requires `-f` flag. No confirmation prompt.

## Plan file paths

- Plan content: `~/.preflight/plans/<slug>/plan.md`
- Plan metadata: `~/.preflight/plans/<slug>/meta.yml`

Agents can read/write `plan.md` directly. Use the CLI for metadata changes.

## Status lifecycle

`draft → in-review → approved → executing → completed → archived`

Also: `rejected` (from in-review), any status can go back to `draft`.

## Step tracking

Steps are auto-extracted from `### Step N:` headings under `## Implementation`.
After writing plan content, run `pf update <slug> --sync-steps` to populate steps.
During execution, mark progress with `pf update <slug> --complete-step N`.

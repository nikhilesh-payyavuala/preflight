# AGENTS.md

Instructions for AI agents contributing to this repository.

## Setup

```bash
bun install
bun test              # Run all tests — must pass before any PR
bun src/cli/index.ts  # Run the CLI in dev (no global install needed)
```

## Testing

Tests use `bun:test`. Every test sets `PREFLIGHT_HOME` to a temp directory so it never touches `~/.preflight/`.

```bash
bun test                    # All tests
bun test test/core/         # Core logic only
bun test test/cli/          # CLI smoke tests
```

If you add a new command or modify core logic, add tests. CLI tests run each command as a subprocess and verify exit codes + output patterns.

## Architecture

Plans are stored at `~/.preflight/plans/<slug>/` — one directory per plan:
- `plan.md` — human/agent readable content (five sections)
- `meta.yml` — machine-readable metadata (status, repos, tags, owner, parent/children)

The CLI (`src/cli/`) is the only interface that reads/writes the store. Skills (`skills/`) are markdown files that guide agents on when and how to call the CLI.

See [docs/architecture.md](docs/architecture.md) for the full design.

## Conventions

- Use `bun:sqlite` for SQLite, not `better-sqlite3`
- Use `Bun.file()` / `Bun.write()` for file I/O, not `fs.readFile`/`writeFile`
- Use `Bun.$` for shell commands, not `child_process` or `execa`
- The SQLite index (`~/.preflight/index.db`) is derived — never the source of truth
- Set `PREFLIGHT_HOME` in tests to avoid touching the user's actual plan store

# Skills

Skills are markdown files that Claude Code loads to guide agent behavior. Each skill in `skills/` maps to a phase of the plan lifecycle.

## Installation

Skills must be symlinked into `~/.claude/skills/` (Claude Code) and `~/.agents/skills/` (other agents):

```bash
for skill in preflight-create-plan preflight-search-plans preflight-review-plan preflight-execute-plan; do
  ln -sf /Users/panik/preflight/skills/$skill ~/.agents/skills/$skill
  ln -sf /Users/panik/preflight/skills/$skill ~/.claude/skills/$skill
done
```

The symlinks point to the live source in this repo, so edits to `skills/*/SKILL.md` take effect immediately without relinking.

## The Four Skills

### `preflight-search-plans`
**Trigger:** Before starting any task. Find existing plans before creating new ones.

Key behavior: runs `pf search` with optional filters (`--status`, `--repo`, `--tag`), interprets status values, explains when to update an existing plan vs. create a new one.

### `preflight-create-plan`
**Trigger:** Starting a new feature, task, or bug fix that warrants a plan.

Key behavior: investigate the codebase first, detect repos with `git rev-parse --show-toplevel`, scaffold with `pf new`, write all five sections of `plan.md`, self-review against a checklist, then set status to `in-review`.

### `preflight-review-plan`
**Trigger:** Asked to review a plan, or before executing a plan that lacks human approval.

Key behavior: reads the plan with `pf show`, evaluates each section against explicit criteria (verifiable goals, runnable verification commands, specific file paths in steps, security/performance concerns), writes a structured review with `pf update --review`, sets status to `approved` or back to `draft`.

### `preflight-execute-plan`
**Trigger:** Implementing an approved plan.

Key behavior: verifies status is `approved` before starting, marks `executing`, follows Implementation steps exactly (deviations are noted via `pf update --review`), runs all Verification commands, marks `completed` and calls `pf update --add-pr` after PR creation.

## Skill File Format

```markdown
---
name: preflight-create-plan
description: Use when starting a new coding task — creates a structured plan before implementation
---

# skill content...
```

The `description` field is what Claude Code shows in the skill list and uses to decide whether to invoke the skill. Keep it under 500 chars and use "Use when..." format.

## Relationship to CLI

Skills are the "how to use `pf`" layer. They don't contain business logic — they contain process guidance. All state changes go through the CLI:

```
Skill says: "run pf new <slug> --title '...' --repo $(git rev-parse ...)"
CLI creates: ~/.preflight/plans/<slug>/plan.md + meta.yml
Skill says: "write the plan content to ~/.preflight/plans/<slug>/plan.md"
Agent writes: plan.md directly via file system
Skill says: "run pf update <slug> --status in-review"
CLI updates: meta.yml, re-indexes in SQLite
```

Skills reference `pf` as the command name. The `pf` wrapper at `~/.local/bin/pf` must be installed for skills to work end-to-end.

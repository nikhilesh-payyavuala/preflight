---
name: preflight-create-plan
description: Use when starting a new coding task or feature — creates a structured plan in the Preflight store before any implementation begins
---

# preflight:create-plan

Create a structured plan in Preflight before touching any code. The plan is the artifact — it outlives this conversation and is searchable, reviewable, and executable later.

See [cli.md](../cli.md) for full CLI reference.

## Checklist

1. **Search for existing plans** — avoid duplicates
2. **Check for a parent spec** — is this part of a larger initiative?
3. **Investigate the codebase** — understand scope before writing
4. **Scaffold the plan** — `pf new`
5. **Write the plan** — fill in all sections of plan.md
6. **Self-review** — verify completeness
7. **Submit for review** — `pf update --status in-review`

## Step 1 — Search first

```bash
pf search "<keywords from task>"
pf search --repo "$(git rev-parse --show-toplevel)"
```

If a relevant plan exists, update it instead of creating a new one. If a parent spec exists, create a child plan with `--parent`.

## Step 2 — Investigate the codebase

Before writing anything:
- Read relevant files, configs, and existing patterns
- Identify all files that will be created or modified
- Note dependencies, constraints, and risks

## Step 3 — Scaffold

```bash
pf new <slug> \
  --title "<Human-readable title>" \
  --repo "$(git rev-parse --show-toplevel)" \
  --tags "<comma,separated,tags>" \
  --author "claude" \
  --owner "<human who owns this work>" \
  --parent "<parent-spec-slug>"
```

Slug: lowercase, hyphens, descriptive (`auth-migration-oauth2` not `plan1`).

## Step 4 — Write the plan

Write directly to `~/.preflight/plans/<slug>/plan.md`:

**Context** — Why. Problem, design decisions, tradeoffs. If child plan, reference parent: "See [parent-slug] for full context."

**Goals** — What "done" looks like. Prose, not checkboxes.

**Reviews** — Leave empty. Appended by `pf update --review`.

**Verification** — Concrete commands with expected outputs.

**Implementation** — Numbered steps (`### Step N: title`). Each step names exact files and has enough detail for an agent with no prior context.

## Step 5 — Self-review

Before submitting, verify:
- Context explains WHY, not just what
- Every goal is verifiable
- Verification commands are real and runnable
- Every implementation step names exact files
- No step is too large to be atomic

## Step 6 — Submit

```bash
pf update <slug> --status in-review
```

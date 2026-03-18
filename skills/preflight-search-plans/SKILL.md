---
name: preflight-search-plans
description: Use when starting any task to check for existing plans, or when looking for context about prior work in a codebase
---

# preflight:search-plans

Always search before creating. Plans accumulate context, decisions, and history that are valuable even when a task seems new.

## When to use

- Before `preflight:create-plan` — check if the plan exists
- When a task feels familiar — there may be a related plan with prior context
- When investigating a codebase area — find plans that touched it before
- When a human references prior work — find the plan they mean

## Commands

**Search by keyword:**
```bash
pf search "<keywords>"
```

**List all plans:**
```bash
pf search
```

**Filter by current repo:**
```bash
pf search --repo "$(git rev-parse --show-toplevel)"
```

**Filter by status:**
```bash
pf search --status approved
pf search --status completed
```

**Filter by tag:**
```bash
pf search --tag auth
```

**Filter by owner — find what's on someone's plate:**
```bash
pf search --owner alice
pf search --owner nik
```

**Show a specific plan:**
```bash
pf show <slug> --brief     # Context + Goals + Reviews only (human view)
pf show <slug>             # Full plan including Implementation
pf show <slug> --meta      # Metadata: status, repos, tags, PRs, parent, children, owner
```

## Understanding hierarchy

Plans can have parent-child relationships:

```bash
pf show <parent-slug> --meta
```

This shows the parent's `children` list with each child's status and owner — a dashboard view. If a plan has a `parent` field, read the parent for broader context.

## Interpreting results

- **draft** — plan was created but not yet written or submitted
- **in-review** — waiting for human or agent review
- **approved** — ready to execute
- **executing** — currently being implemented
- **completed** — done, linked to one or more PRs
- **rejected** — not proceeding (read the Reviews section for why)
- **archived** — no longer relevant

## If you find a relevant plan

Read it fully with `pf show <slug>`. Pay attention to:
- **Context** — the original intent and constraints
- **Reviews** — decisions made, concerns raised, things that changed
- **Goals** — what was actually in scope
- **Verification** — what "done" looked like
- **Children** — if it's a spec, check which child plans exist and their status

If the existing plan covers your task, consider updating it (`pf update <slug> --status executing`) rather than creating a duplicate.

If the existing plan is a spec that covers the broader initiative but no child plan exists for your specific task, create a child plan with `pf new <slug> --parent <spec-slug>`.

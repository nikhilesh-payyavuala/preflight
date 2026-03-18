---
name: preflight-search-plans
description: Use when starting any task to check for existing plans, or when looking for context about prior work in a codebase
---

# preflight:search-plans

Always search before creating. Plans accumulate context, decisions, and history that are valuable even when a task seems new.

See [cli.md](../cli.md) for full CLI reference.

## When to use

- Before `preflight:create-plan` — check if a plan already exists
- When a task feels familiar — there may be related prior work
- When investigating a codebase area — find plans that touched it
- When a human references prior work — find the plan they mean

## Search

```bash
pf search "<keywords>"               # keyword search
pf search                             # list all
pf search --status approved           # filter by status
pf search --repo "$(git rev-parse --show-toplevel)"  # current repo
pf search --owner alice               # by owner
pf search --tag auth                  # by tag
```

## View a plan

```bash
pf show <slug> --brief   # Context + Goals + Reviews (human view)
pf show <slug>           # Full plan
pf show <slug> --meta    # Metadata: status, repos, tags, steps, parent, children
pf show <slug> --json    # Structured output
```

## Hierarchy

If a plan has children, `pf show <slug> --meta` lists them with statuses. If it has a parent, read the parent for broader context.

## If you find a relevant plan

- Read it fully with `pf show <slug>`
- If it covers your task, update it (`pf update <slug> --status executing`)
- If it's a spec with no child plan for your task, create one with `--parent`
- Don't create duplicates

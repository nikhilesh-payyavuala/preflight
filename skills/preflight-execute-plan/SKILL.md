---
name: preflight-execute-plan
description: Use when asked to implement a feature or task that has an approved Preflight plan — executes the plan step by step with verification
---

# preflight:execute-plan

Execute an approved plan. Follow it exactly. If the plan is wrong, stop and update it rather than silently deviating.

See [cli.md](../cli.md) for full CLI reference.

## Checklist

1. Load the plan
2. Check parent context
3. Verify status is approved
4. Mark as executing + sync steps
5. Execute each step (with checkpoints)
6. Run verification
7. Mark completed + link PRs

## Step 1 — Load

```bash
pf show <slug>
```

If you don't have a slug:
```bash
pf search --status approved --repo "$(git rev-parse --show-toplevel)"
```

## Step 2 — Check parent

```bash
pf show <slug> --meta
```

If parent exists, read it for broader context: `pf show <parent-slug> --brief`

## Step 3 — Verify approved

Status must be `approved`. If not, stop and tell the human.

## Step 4 — Start

```bash
pf update <slug> --status executing
pf update <slug> --sync-steps
```

## Step 5 — Execute steps

For EACH implementation step:

1. Mark in-progress:
   ```bash
   pf update <slug> --start-step N
   ```
2. Read the step fully
3. Implement exactly what it says
4. If blocked — stop, don't guess:
   ```bash
   pf update <slug> --review "Blocked on Step N: <reason>" --by claude
   pf update <slug> --status in-review
   ```
5. Mark completed:
   ```bash
   pf update <slug> --complete-step N
   ```
6. **Do not proceed to Step N+1 until you have run --complete-step.**

**Do not** skip steps, add unplanned features, refactor unrelated code, or change the approach without updating the plan.

## Step 6 — Verify

Run every command in the Verification section. If any fail, debug and fix. If the fix is non-trivial, document it:
```bash
pf update <slug> --review "Fixed: <what changed and why>" --by claude
```

## Step 7 — Complete

```bash
pf update <slug> --status completed
pf update <slug> --add-pr <number>
pf update <slug> --review "Completed. All verifications passed. PR #<n>." --by claude
```

## Deviations

If you deviate from the plan, record it:
```bash
pf update <slug> --review "Deviated from Step 3: plan assumed X but codebase uses Y. Used Y instead." --by claude
```

---
name: preflight-execute-plan
description: Use when asked to implement a feature or task that has an approved Preflight plan — executes the plan step by step with verification
---

# preflight:execute-plan

Execute an approved plan. Follow it exactly. Do not improvise beyond what's written. If you discover the plan is wrong or incomplete, stop and update the plan rather than silently deviating.

## Checklist

1. **Load and read the plan**
2. **Check parent context if child plan**
3. **Verify it's approved**
4. **Mark as executing**
5. **Execute each step**
6. **Run verification**
7. **Mark as completed and link PRs**

## Step 1 — Load the plan

```bash
pf show <slug>
```

Read the entire plan. Understand the Context before touching any code. Know what the Goals are. Understand what Verification will look like at the end.

If you weren't given a slug, search first:
```bash
pf search "<task description>"
pf search --status approved --repo "$(git rev-parse --show-toplevel)"
```

## Step 2 — Check parent context

```bash
pf show <slug> --meta
```

If the plan has a `parent` field, read the parent spec for broader context:
```bash
pf show <parent-slug> --brief
```

The parent spec's Context and Goals frame the overall initiative. Your plan's Implementation is one piece of it. Understanding the parent helps you make better judgment calls when steps are ambiguous.

## Step 3 — Verify it's approved

Status must be `approved`. If it's `draft` or `in-review`, stop and tell the human the plan needs review before execution.

If there are reviews, read them. They may contain important constraints or decisions that override the original Implementation steps.

## Step 4 — Mark as executing

```bash
pf update <slug> --status executing
```

## Step 5 — Execute steps

Work through the Implementation section top to bottom. For each step:

1. Read the step fully before starting
2. Check the files listed — read them if they exist to understand current state
3. Implement exactly what the step says
4. If a step is ambiguous, use the Context and Goals sections (and parent spec if any) to resolve it
5. If a step is impossible as written (dependency missing, file doesn't exist, etc.) — **stop**. Do not guess. Append to Reviews explaining the blocker, set status back to `in-review`, and tell the human.

**Do not:**
- Skip steps because they "seem obvious"
- Add features not in the plan
- Refactor code unrelated to the step
- Change the approach without updating the plan first

## Step 6 — Run verification

After all steps are complete, run every command in the Verification section:

```bash
# Run each command listed under ## Verification
# Confirm the expected output matches
```

If any verification fails:
1. Debug and fix before proceeding
2. If the fix is non-trivial, append to Reviews explaining what changed and why
3. Only mark complete when all verifications pass

## Step 7 — Complete

```bash
# Mark completed
pf update <slug> --status completed

# Link the PR (after creating it)
pf update <slug> --add-pr <number>
```

Append a completion note:
```bash
pf update <slug> \
  --by "claude" \
  --review "Completed. All verification checks passed. PR #<number> created."
```

## If you deviate from the plan

Deviations happen. When they do, be explicit:

```bash
pf update <slug> \
  --by "claude" \
  --review "Deviated from Step 3: the plan assumed X but the codebase uses Y pattern. Used Y instead. All tests still pass."
```

The plan is a record. Keep it accurate.

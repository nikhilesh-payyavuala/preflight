---
name: preflight-review-plan
description: Use when asked to review a plan, or before executing a plan that lacks human approval — evaluates completeness, correctness, and risk
---

# preflight:review-plan

Review a plan critically before it gets approved or executed. Catch problems at plan-time, not code-review-time.

See [cli.md](../cli.md) for full CLI reference.

## Checklist

1. Read the full plan
2. Check hierarchy (parent/children)
3. Evaluate each section
4. Write the review
5. Set status

## Step 1 — Read

```bash
pf show <slug>
pf show <slug> --meta
```

If it has a parent, read the parent for context: `pf show <parent-slug> --brief`

## Step 2 — Evaluate

**Context** — Is the WHY clear? Design decisions explained? Tradeoffs acknowledged?

**Goals** — Verifiable? ("users can log in via OAuth" not "improve auth"). Match the implementation scope?

**Verification** — Real, runnable commands? Cover happy path AND failures?

**Implementation** — Steps specific enough to execute without context? File paths exact? Any step too large (>3 files)? Security concerns? Performance concerns? Cross-repo impacts?

**Ownership** — Owner set? Child plans properly delegated?

**Risk** — Rollback strategy needed? Feature flag? Irreversible operations?

## Step 3 — Write the review

```bash
pf update <slug> --by "claude" --review "APPROVE / REQUEST CHANGES / REJECT

Summary: <1-2 sentences>

Issues:
- [BLOCKING] <must fix before execution>
- [SUGGESTION] <nice to have>

Questions:
- <anything unclear>"
```

Be specific. Not "Step 2 is vague" — instead "Step 2 doesn't handle the case where OAuth returns a profile without an email."

## Step 4 — Set status

```bash
pf update <slug> --status approved    # if approving
pf update <slug> --status draft       # if requesting changes
```

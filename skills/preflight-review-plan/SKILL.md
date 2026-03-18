---
name: preflight-review-plan
description: Use when asked to review a plan, or before executing a plan that lacks human approval — evaluates completeness, correctness, and risk
---

# preflight:review-plan

Review a plan critically before it gets approved or executed. The goal is to catch problems at plan-time, not code-review-time.

## Checklist

1. **Read the full plan**
2. **Check hierarchy** — read the parent spec if this is a child plan
3. **Evaluate each section** against the criteria below
4. **Write the review** — specific, actionable, attributed
5. **Set recommendation** — approve or request changes

## Step 1 — Read the full plan

```bash
pf show <slug>
pf show <slug> --meta
```

Read everything: Context, Goals, Reviews (what prior reviewers said), Verification, Implementation. Check metadata for parent, children, and owner.

## Step 2 — Check hierarchy

If this plan has a `parent`, read the parent spec:
```bash
pf show <parent-slug> --brief
```

Verify that this plan's Goals are consistent with the parent spec's Goals. Flag any scope drift — the child plan should implement its portion, not redefine the overall initiative.

If this is a parent spec with children, check that the children collectively cover all the Goals:
```bash
pf show <slug> --meta   # lists children with statuses
```

## Step 3 — Evaluate

**Context**
- [ ] Is the WHY clear? Would a new team member understand the motivation?
- [ ] Are design decisions explained? (not just what, but why this approach)
- [ ] Are tradeoffs acknowledged?
- [ ] If child plan: does it reference the parent spec for broader context?

**Goals**
- [ ] Are all goals verifiable? ("users can log in via OAuth" ✓, "improve auth" ✗)
- [ ] Do the goals match the Implementation scope? (no goal without an implementation step)
- [ ] Are edge cases and failure modes in scope?
- [ ] If child plan: are goals scoped to this plan's portion, not duplicating the parent?

**Verification**
- [ ] Are these real, runnable commands?
- [ ] Do they cover the happy path AND key failure cases?
- [ ] Would a passing verification suite actually mean the plan succeeded?

**Implementation**
- [ ] Is every step specific enough to execute without additional context?
- [ ] Are file paths exact?
- [ ] Are there hidden dependencies between steps that aren't called out?
- [ ] Is any step too large? (a step that touches >3 files is probably too big)
- [ ] Are there security concerns? (auth, input validation, SQL injection, secrets in code)
- [ ] Are there performance concerns? (N+1 queries, missing indexes, unbounded loops)
- [ ] Cross-repo impacts — does any step touch APIs consumed by other services?

**Ownership**
- [ ] Is the owner field set? (who is accountable for this plan?)
- [ ] If multiple people are involved, are child plans properly delegated?

**Risk**
- [ ] Does this plan need a rollback strategy?
- [ ] Is there a feature flag or migration path if things go wrong?
- [ ] Does this touch anything irreversible (database migrations, external API calls, emails)?

## Step 4 — Write the review

```bash
pf update <slug> \
  --by "claude" \
  --review "<your review text>"
```

Review format:
```
APPROVE / REQUEST CHANGES / REJECT

Summary: <1-2 sentences on overall assessment>

Issues:
- [BLOCKING] <specific problem that must be fixed before execution>
- [SUGGESTION] <improvement that would be nice but isn't required>

Concerns:
- <security/performance/reliability concern with specifics>

Questions:
- <anything unclear that the plan author should clarify>
```

Be specific. "Step 2 is vague" is not useful. "Step 2 doesn't specify how to handle the case where the OAuth provider returns a profile without an email — this will cause a null pointer in user creation" is useful.

## Step 5 — Set status

If approving:
```bash
pf update <slug> --status approved
```

If requesting changes:
```bash
pf update <slug> --status draft
```

(The author revises and resubmits with `pf update <slug> --status in-review`)

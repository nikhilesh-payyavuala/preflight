---
name: preflight-create-plan
description: Use when starting a new coding task or feature — creates a structured plan in the Preflight store before any implementation begins
---

# preflight:create-plan

Create a structured plan in Preflight before touching any code. The plan is the artifact — it outlives this conversation and is searchable, reviewable, and executable later.

## Checklist

1. **Search for existing plans** — run `pf search <keywords>` to avoid duplicates
2. **Check for a parent spec** — is this part of a larger initiative?
3. **Investigate the codebase** — understand the scope before writing the plan
4. **Determine repos** — identify all repos this plan touches
5. **Scaffold the plan** — run `pf new`
6. **Write the plan** — fill in all sections
7. **Self-review** — verify the plan is complete and executable
8. **Set status to in-review** — handoff to human or review agent

## Step 1 — Search for existing plans

```bash
pf search "<keywords from task>"
pf search --repo .
```

If a relevant plan exists, consider updating it instead of creating a new one.

If you find a parent spec that covers this work, create your plan as a child of it (Step 3).

## Step 2 — Check for a parent spec

Ask yourself: is this task part of a larger initiative? If someone has already created a spec for the broader feature, your plan should be a child of it.

```bash
pf search "<broader feature keywords>"
```

If you find a parent spec, note its slug for `--parent` in Step 3.

## Step 3 — Investigate the codebase

Before writing anything:
- Read relevant files, configs, and existing patterns
- Understand what already exists vs. what needs to be built
- Identify all files that will be created or modified
- Note any dependencies, constraints, or risks

## Step 4 — Scaffold the plan

```bash
pf new <slug> \
  --title "<Human-readable title>" \
  --repo "$(git rev-parse --show-toplevel)" \
  --tags "<comma,separated,tags>" \
  --author "claude" \
  --owner "<human who owns this work>" \
  --parent "<parent-spec-slug>"
```

Slug rules: lowercase, hyphens only, descriptive (`auth-migration-oauth2` not `plan1`).

**`--owner`** is the human responsible for this plan. If you know who requested the work, set them as owner. If you don't know, omit it — the human can set it later with `pf update <slug> --owner <name>`.

**`--parent`** creates a child plan linked to a parent spec. The parent's `children` list is automatically updated. Use this when your plan implements one part of a larger spec.

If the plan touches multiple repos, add them after:
```bash
pf update <slug> --add-repo /path/to/other/repo
```

## Step 5 — Write the plan

The plan lives at `~/.preflight/plans/<slug>/plan.md`. Write all sections:

**Context** — Why this is being done. What problem it solves. Key design decisions and tradeoffs. If this is a child plan, reference the parent: "See [parent-slug] for full context." Only add context specific to this plan's scope.

**Goals** — What does "done" look like? Success criteria, scope boundaries, acceptance criteria. Write as prose or bullet points — not checkboxes. A human should be able to glance at these and understand the scope.

**Reviews** — Leave this section empty. Reviews are appended by `pf update --review`.

**Verification** — Concrete commands with expected outputs. The executing agent runs these after finishing. Examples:
```
- `bun test src/auth/` — all 12 tests pass
- `curl -I localhost:3000/auth/google` — 302 redirect to Google
```

**Implementation** — Numbered steps. Each step:
- Has a descriptive title
- Lists exact files to create or modify with line ranges if relevant
- Contains enough prose that an agent with no prior context can execute it
- Includes specific code patterns, library choices, or constraints

Write steps so they can be executed independently if needed. Avoid vague instructions like "add error handling" — be specific about what errors and how to handle them.

**For specs (parent plans with no Implementation):** You may omit the Implementation and Verification sections entirely. A spec is a plan with only Context + Goals — it defines what to build and why, leaving the how to child plans.

## Step 6 — Self-review before submitting

Before marking in-review, verify:
- [ ] Context explains WHY, not just what
- [ ] Every Goal is verifiable (not "improve performance" — "p99 latency < 200ms")
- [ ] Verification commands are real and runnable
- [ ] Every Implementation step names exact files
- [ ] No step is so large it can't be done atomically
- [ ] Cross-repo dependencies are called out explicitly
- [ ] If this is a child plan, the parent slug is set

## Step 7 — Submit for review

```bash
pf update <slug> --status in-review
```

Then either:
- Tell the human the plan is ready: `pf show <slug> --brief`
- Or invoke `preflight:review-plan` to do an agent self-review first

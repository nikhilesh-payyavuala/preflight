import React from "react";
import { render } from "ink";
import { readMeta } from "../../core/meta.ts";
import { planPath } from "../../core/store.ts";
import { resolveSlug } from "../interactive.ts";
import { STATUS_COLOR, RESET } from "../format.ts";
import { PlanView } from "../../tui/PlanView.js";
import type { PlanMeta } from "../../types/index.ts";

const STEP_ICON = { pending: "○", "in-progress": "▶", completed: "✓" } as const;

function formatStepsDetail(meta: PlanMeta): string | null {
  const steps = meta.steps ?? [];
  if (steps.length === 0) return null;
  const done = steps.filter((s) => s.status === "completed").length;
  const lines = [`steps:   ${done}/${steps.length} completed`];
  for (let i = 0; i < steps.length; i++) {
    const s = steps[i];
    const icon = STEP_ICON[s.status] ?? "?";
    lines.push(`  ${icon} ${i + 1}. ${s.title}`);
  }
  return lines.join("\n");
}

export async function cmdShow(slug: string | undefined, opts: { brief?: boolean; json?: boolean; meta?: boolean }): Promise<void> {
  const resolved = await resolveSlug(slug, { prompt: "show> " });
  if (!resolved) process.exit(0);
  const meta = await readMeta(resolved);

  // --meta: plain text metadata (for agents and scripts)
  if (opts.meta) {
    if (opts.json) {
      console.log(JSON.stringify(meta, null, 2));
      return;
    }
    const color = STATUS_COLOR[meta.status] ?? "";
    console.log(`slug:    ${meta.slug}`);
    console.log(`title:   ${meta.title}`);
    console.log(`status:  ${color}${meta.status}${RESET}`);
    console.log(`author:  ${meta.author}`);
    console.log(`created: ${meta.created}`);
    console.log(`updated: ${meta.updated}`);
    if (meta.owner) console.log(`owner:   ${meta.owner}`);
    if (meta.repos.length) console.log(`repos:\n  ${meta.repos.join("\n  ")}`);
    if (meta.tags.length) console.log(`tags:    ${meta.tags.join(", ")}`);
    if (meta.parent) console.log(`parent:  ${meta.parent}`);
    if (meta.children.length) {
      console.log(`children:`);
      for (const child of meta.children) {
        try {
          const childMeta = await readMeta(child);
          const childColor = STATUS_COLOR[childMeta.status] ?? "";
          const ownerLabel = childMeta.owner ? ` (${childMeta.owner})` : "";
          console.log(`  ${childColor}${childMeta.status.padEnd(10)}${RESET}  ${child}  —  ${childMeta.title}${ownerLabel}`);
        } catch {
          console.log(`  ?           ${child}  (not found)`);
        }
      }
    }
    if (meta.prs.length) {
      console.log(`prs:`);
      for (const pr of meta.prs) {
        console.log(`  #${pr.number} — ${pr.repo}`);
      }
    }
    if (meta["depends-on"].length) {
      console.log(`depends-on: ${meta["depends-on"].join(", ")}`);
    }
    const stepsDetail = formatStepsDetail(meta);
    if (stepsDetail) console.log(stepsDetail);
    return;
  }

  const file = Bun.file(planPath(resolved));
  if (!(await file.exists())) {
    console.error(`plan.md not found for: ${resolved}`);
    process.exit(1);
  }

  const content = await file.text();

  // --json: machine-readable
  if (opts.json) {
    console.log(JSON.stringify({ meta, content }, null, 2));
    return;
  }

  // Render with Ink for proper markdown
  const { unmount } = render(
    React.createElement(PlanView, { meta, content, brief: opts.brief })
  );
  unmount();

  // Interactive actions for actionable statuses (TTY only)
  if (process.stdout.isTTY && ["in-review", "draft", "approved"].includes(meta.status)) {
    await showActions(resolved, meta.status);
  }
}

async function showActions(slug: string, status: string): Promise<void> {
  const { fzfSelect } = await import("../interactive.ts");
  const { updateMeta } = await import("../../core/meta.ts");

  const actions: string[] = [];
  if (status === "in-review") {
    actions.push("✓  Approve", "✗  Reject", "✎  Edit in $EDITOR", "⏎  Done");
  } else if (status === "draft") {
    actions.push("→  Submit for review", "✎  Edit in $EDITOR", "⏎  Done");
  } else if (status === "approved") {
    actions.push("▶  Start executing", "✎  Edit in $EDITOR", "⏎  Done");
  }

  const selected = await fzfSelect(actions, {
    prompt: "action> ",
    header: `Plan: ${slug} (${status})`,
  });

  if (!selected) return;

  if (selected.includes("Approve")) {
    await updateMeta(slug, { status: "approved" });
    console.log(`Approved: ${slug}`);
  } else if (selected.includes("Reject")) {
    await updateMeta(slug, { status: "rejected" });
    console.log(`Rejected: ${slug}`);
  } else if (selected.includes("Submit for review")) {
    await updateMeta(slug, { status: "in-review" });
    console.log(`Submitted for review: ${slug}`);
  } else if (selected.includes("Start executing")) {
    await updateMeta(slug, { status: "executing" });
    console.log(`Now executing: ${slug}`);
  } else if (selected.includes("Edit")) {
    const editor = process.env.EDITOR ?? process.env.VISUAL ?? "vi";
    const { planPath } = await import("../../core/store.ts");
    await Bun.$`${editor} ${planPath(slug)}`;
  }
}

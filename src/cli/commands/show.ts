import { readMeta, updateMeta } from "../../core/meta.ts";
import { planPath } from "../../core/store.ts";
import { resolveSlug, pickSlug } from "../interactive.ts";
import { STATUS_COLOR, RESET } from "../format.ts";
import { marked } from "marked";
import { markedTerminal } from "marked-terminal";
import { select } from "@clack/prompts";
import type { PlanMeta, PlanStatus } from "../../types/index.ts";

const STEP_ICON = { pending: "○", "in-progress": "▶", completed: "✓" } as const;

function formatStepsDetail(meta: PlanMeta): string | null {
  const steps = meta.steps ?? [];
  if (steps.length === 0) return null;
  const done = steps.filter((s) => s.status === "completed").length;
  const lines = [`steps:   ${done}/${steps.length} completed`];
  for (let i = 0; i < steps.length; i++) {
    const s = steps[i];
    const icon = STEP_ICON[s.status] ?? "?";
    const color = s.status === "completed" ? "\x1b[32m" : s.status === "in-progress" ? "\x1b[36m" : "\x1b[90m";
    lines.push(`  ${color}${icon} ${i + 1}. ${s.title}${RESET}`);
  }
  return lines.join("\n");
}

function renderMarkdown(content: string): string {
  const origEnv = process.env.FORCE_COLOR;
  process.env.FORCE_COLOR = "1";
  marked.use(markedTerminal({ showSectionPrefix: false }));
  const result = (marked.parse(content) as string)
    .replace(/^( *)(\* )/gm, "$1- ")
    .trim();
  if (origEnv === undefined) delete process.env.FORCE_COLOR;
  else process.env.FORCE_COLOR = origEnv;
  return result;
}

function printHeader(meta: PlanMeta): void {
  const color = STATUS_COLOR[meta.status] ?? "";
  console.log(`\x1b[1m${meta.title}\x1b[0m  \x1b[2m(${meta.slug})\x1b[0m`);
  const ownerPart = meta.owner ? `  |  Owner: ${meta.owner}` : "";
  console.log(`Status: ${color}${meta.status}${RESET}  |  Author: ${meta.author}${ownerPart}  |  Updated: ${meta.updated.slice(0, 10)}`);
  const steps = meta.steps ?? [];
  if (steps.length > 0) {
    const done = steps.filter((s) => s.status === "completed").length;
    console.log(`Steps: ${done}/${steps.length}`);
  }
  if (meta.parent) console.log(`Parent: ${meta.parent}`);
  if (meta.repos.length) console.log(`Repos: ${meta.repos.join(", ")}`);
  if (meta.tags.length) console.log(`Tags: ${meta.tags.join(", ")}`);
}

async function printChildren(meta: PlanMeta): Promise<void> {
  if (meta.children.length === 0) return;
  console.log(`\nChildren:`);
  for (const child of meta.children) {
    try {
      const childMeta = await readMeta(child);
      const cc = STATUS_COLOR[childMeta.status] ?? "";
      const ow = childMeta.owner ? ` (${childMeta.owner})` : "";
      console.log(`  ${cc}${childMeta.status.padEnd(10)}${RESET}  ${child}  —  ${childMeta.title}${ow}`);
    } catch {
      console.log(`  ?           ${child}  (not found)`);
    }
  }
}

// --- Actions after viewing a plan ---

const STATUS_ACTIONS: Record<string, { value: string; label: string }[]> = {
  draft: [
    { value: "in-review", label: "Submit for review" },
    { value: "edit", label: "Edit in $EDITOR" },
    { value: "back", label: "Back to list" },
    { value: "done", label: "Done" },
  ],
  "in-review": [
    { value: "approved", label: "Approve" },
    { value: "rejected", label: "Reject" },
    { value: "edit", label: "Edit in $EDITOR" },
    { value: "back", label: "Back to list" },
    { value: "done", label: "Done" },
  ],
  approved: [
    { value: "executing", label: "Start executing" },
    { value: "edit", label: "Edit in $EDITOR" },
    { value: "back", label: "Back to list" },
    { value: "done", label: "Done" },
  ],
  executing: [
    { value: "completed", label: "Mark completed" },
    { value: "in-review", label: "Back to in-review" },
    { value: "edit", label: "Edit in $EDITOR" },
    { value: "back", label: "Back to list" },
    { value: "done", label: "Done" },
  ],
  completed: [
    { value: "archived", label: "Archive" },
    { value: "draft", label: "Reopen as draft" },
    { value: "back", label: "Back to list" },
    { value: "done", label: "Done" },
  ],
  rejected: [
    { value: "draft", label: "Reopen as draft" },
    { value: "archived", label: "Archive" },
    { value: "back", label: "Back to list" },
    { value: "done", label: "Done" },
  ],
  archived: [
    { value: "draft", label: "Reopen as draft" },
    { value: "back", label: "Back to list" },
    { value: "done", label: "Done" },
  ],
};

async function promptAction(slug: string, status: string): Promise<"back" | "done"> {
  const options = STATUS_ACTIONS[status] ?? [
    { value: "back", label: "Back to list" },
    { value: "done", label: "Done" },
  ];

  const action = await select({ message: "Action:", options });
  if (typeof action !== "string") return "done";

  if (action === "back" || action === "done") return action;

  if (action === "edit") {
    const editor = process.env.EDITOR ?? process.env.VISUAL ?? "vi";
    await Bun.$`${editor} ${planPath(slug)}`;
    return "back";
  }

  // Status transition
  await updateMeta(slug, { status: action as PlanStatus });
  console.log(`${slug} → ${action}`);
  return "back";
}

// --- Show a single plan ---

async function showPlan(slug: string, opts: { brief?: boolean; json?: boolean; meta?: boolean }): Promise<void> {
  const meta = await readMeta(slug);

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
    await printChildren(meta);
    if (meta.prs.length) {
      console.log(`prs:`);
      for (const pr of meta.prs) console.log(`  #${pr.number} — ${pr.repo}`);
    }
    if (meta["depends-on"].length) console.log(`depends-on: ${meta["depends-on"].join(", ")}`);
    const stepsDetail = formatStepsDetail(meta);
    if (stepsDetail) console.log(stepsDetail);
    return;
  }

  const file = Bun.file(planPath(slug));
  if (!(await file.exists())) {
    console.error(`plan.md not found for: ${slug}`);
    process.exit(1);
  }

  const content = await file.text();

  if (opts.json) {
    console.log(JSON.stringify({ meta, content }, null, 2));
    return;
  }

  printHeader(meta);
  await printChildren(meta);

  const stepsDetail = formatStepsDetail(meta);
  if (stepsDetail) console.log(`\n${stepsDetail}`);
  console.log("");

  let body = content;
  if (opts.brief) {
    const lines = content.split("\n");
    const implIdx = lines.findIndex((l) => l.match(/^## Implementation/i));
    if (implIdx !== -1) body = lines.slice(0, implIdx).join("\n").trimEnd();
  }

  process.stdout.write(renderMarkdown(body) + "\n");
}

// --- Main command ---

export async function cmdShow(slug: string | undefined, opts: { brief?: boolean; json?: boolean; meta?: boolean }): Promise<void> {
  // Direct slug: show and optionally prompt for action
  if (slug) {
    await showPlan(slug, opts);
    if (process.stdout.isTTY && !opts.json && !opts.meta) {
      const meta = await readMeta(slug);
      await promptAction(slug, meta.status);
    }
    return;
  }

  // No slug: browse loop — fzf picks, we show + prompt, loop back
  while (true) {
    const picked = await pickSlug({ prompt: "show> " });
    if (!picked) return; // Esc exits

    await showPlan(picked, opts);

    if (!process.stdout.isTTY) return;

    const meta = await readMeta(picked);
    const result = await promptAction(picked, meta.status);
    if (result === "done") return;
    // "back" → loop continues, fzf re-opens
  }
}

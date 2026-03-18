import { readMeta } from "../../core/meta.ts";
import { planPath } from "../../core/store.ts";
import { resolveSlug, fzfSelect } from "../interactive.ts";
import { STATUS_COLOR, RESET } from "../format.ts";
import { marked } from "marked";
import { markedTerminal } from "marked-terminal";
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
    const color = s.status === "completed" ? "\x1b[32m" : s.status === "in-progress" ? "\x1b[36m" : "\x1b[90m";
    lines.push(`  ${color}${icon} ${i + 1}. ${s.title}${RESET}`);
  }
  return lines.join("\n");
}

function renderMarkdown(content: string): string {
  const origEnv = process.env.FORCE_COLOR;
  process.env.FORCE_COLOR = "1";

  marked.use(markedTerminal({
    showSectionPrefix: false,
  }));
  const result = (marked.parse(content) as string).trim();

  if (origEnv === undefined) delete process.env.FORCE_COLOR;
  else process.env.FORCE_COLOR = origEnv;

  return result;
}

function printHeader(meta: PlanMeta): void {
  const color = STATUS_COLOR[meta.status] ?? "";
  console.log(`\x1b[1m${meta.title}\x1b[0m  \x1b[2m(${meta.slug})\x1b[0m`);
  const ownerPart = meta.owner ? `  |  Owner: ${meta.owner}` : "";
  console.log(
    `Status: ${color}${meta.status}${RESET}  |  Author: ${meta.author}${ownerPart}  |  Updated: ${meta.updated.slice(0, 10)}`
  );
  const steps = meta.steps ?? [];
  if (steps.length > 0) {
    const done = steps.filter((s) => s.status === "completed").length;
    console.log(`Steps: ${done}/${steps.length}`);
  }
  if (meta.parent) console.log(`Parent: ${meta.parent}`);
  if (meta.repos.length) console.log(`Repos: ${meta.repos.join(", ")}`);
  if (meta.tags.length) console.log(`Tags: ${meta.tags.join(", ")}`);
  if (meta.children.length) {
    console.log(`\nChildren:`);
    for (const child of meta.children) {
      try {
        // Sync read - we're in a print function, readMeta is async
        // Use a placeholder; the async version is in the meta display path
      } catch {}
    }
  }
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

export async function cmdShow(slug: string | undefined, opts: { brief?: boolean; json?: boolean; meta?: boolean }): Promise<void> {
  const resolved = await resolveSlug(slug, { prompt: "show> " });
  if (!resolved) process.exit(0);
  const meta = await readMeta(resolved);

  // --meta: plain text metadata
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

  const file = Bun.file(planPath(resolved));
  if (!(await file.exists())) {
    console.error(`plan.md not found for: ${resolved}`);
    process.exit(1);
  }

  const content = await file.text();

  if (opts.json) {
    console.log(JSON.stringify({ meta, content }, null, 2));
    return;
  }

  // Print header
  printHeader(meta);
  await printChildren(meta);

  // Print step progress
  const stepsDetail = formatStepsDetail(meta);
  if (stepsDetail) console.log(`\n${stepsDetail}`);

  console.log("");

  // Render markdown body with ANSI colors
  let body = content;
  if (opts.brief) {
    const lines = content.split("\n");
    const implIdx = lines.findIndex((l) => l.match(/^## Implementation/i));
    if (implIdx !== -1) body = lines.slice(0, implIdx).join("\n").trimEnd();
  }

  process.stdout.write(renderMarkdown(body) + "\n");

  // Interactive actions for actionable statuses (TTY only)
  if (process.stdout.isTTY && ["in-review", "draft", "approved"].includes(meta.status)) {
    await showActions(resolved, meta.status);
  }
}

async function showActions(slug: string, status: string): Promise<void> {
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
    const { planPath: pp } = await import("../../core/store.ts");
    await Bun.$`${editor} ${pp(slug)}`;
  }
}

import { marked } from "marked";
import { markedTerminal } from "marked-terminal";
import { readMeta } from "../../core/meta.ts";
import { planPath } from "../../core/store.ts";
import { STATUS_COLOR, RESET } from "../format.ts";
import type { PlanMeta } from "../../types/index.ts";

const STEP_ICON = { pending: "○", "in-progress": "▶", completed: "✓" } as const;

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

function printSteps(meta: PlanMeta): void {
  const steps = meta.steps ?? [];
  if (steps.length === 0) return;
  const done = steps.filter((s) => s.status === "completed").length;
  console.log(`\nsteps:   ${done}/${steps.length} completed`);
  for (let i = 0; i < steps.length; i++) {
    const s = steps[i];
    const icon = STEP_ICON[s.status] ?? "?";
    const color = s.status === "completed" ? "\x1b[32m" : s.status === "in-progress" ? "\x1b[36m" : "\x1b[90m";
    console.log(`  ${color}${icon} ${i + 1}. ${s.title}${RESET}`);
  }
}

// Render a plan to the terminal with markdown styling
export async function renderPlan(slug: string, opts: { brief?: boolean } = {}): Promise<void> {
  const meta = await readMeta(slug);
  const file = Bun.file(planPath(slug));
  if (!(await file.exists())) {
    console.error(`plan.md not found for: ${slug}`);
    process.exit(1);
  }

  const content = await file.text();

  printHeader(meta);
  await printChildren(meta);
  printSteps(meta);
  console.log("");

  let body = content;
  if (opts.brief) {
    const lines = content.split("\n");
    const implIdx = lines.findIndex((l) => l.match(/^## Implementation/i));
    if (implIdx !== -1) body = lines.slice(0, implIdx).join("\n").trimEnd();
  }

  process.stdout.write(renderMarkdown(body) + "\n");
}

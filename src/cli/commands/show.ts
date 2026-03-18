import { readMeta } from "../../core/meta.ts";
import { planPath } from "../../core/store.ts";
import { STATUS_COLOR, RESET } from "../format.ts";
import type { PlanMeta } from "../../types/index.ts";

const STEP_ICON = { pending: "○", "in-progress": "▶", completed: "✓" } as const;

// --- Data output (for agents, scripts, pipes) ---

function printMeta(meta: PlanMeta): void {
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
  if (meta.children.length) console.log(`children: ${meta.children.join(", ")}`);
  if (meta.prs.length) {
    console.log(`prs:`);
    for (const pr of meta.prs) console.log(`  #${pr.number} — ${pr.repo}`);
  }
  if (meta["depends-on"].length) console.log(`depends-on: ${meta["depends-on"].join(", ")}`);
  const steps = meta.steps ?? [];
  if (steps.length > 0) {
    const done = steps.filter((s) => s.status === "completed").length;
    console.log(`steps:   ${done}/${steps.length} completed`);
    for (let i = 0; i < steps.length; i++) {
      const s = steps[i];
      const icon = STEP_ICON[s.status] ?? "?";
      console.log(`  ${icon} ${i + 1}. ${s.title}`);
    }
  }
}

// --- Main command ---

export async function cmdShow(slug: string | undefined, opts: { brief?: boolean; json?: boolean; meta?: boolean }): Promise<void> {
  // No slug: interactive TUI browser (humans only)
  if (!slug) {
    const { pickSlug } = await import("../tui/picker.ts");
    const { renderPlan } = await import("../tui/render.ts");
    const { promptAction } = await import("../tui/actions.ts");

    while (true) {
      const picked = await pickSlug({ prompt: "show> " });
      if (!picked) return;

      await renderPlan(picked, { brief: opts.brief });

      const meta = await readMeta(picked);
      const result = await promptAction(picked, meta.status);
      if (result === "done") return;
    }
  }

  // Slug provided: data output (works for agents and humans)
  const meta = await readMeta(slug);

  if (opts.meta) {
    if (opts.json) {
      console.log(JSON.stringify(meta, null, 2));
    } else {
      printMeta(meta);
    }
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

  // With slug: render with markdown (still useful for humans running pf show <slug>)
  const { renderPlan } = await import("../tui/render.ts");
  await renderPlan(slug, { brief: opts.brief });
}

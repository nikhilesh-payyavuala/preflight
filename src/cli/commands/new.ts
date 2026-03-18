import { mkdir } from "fs/promises";
import { planDir, planPath, planExists, ensureStore } from "../../core/store.ts";
import { newMeta, writeMeta, addChild } from "../../core/meta.ts";
import { indexPlan, initDb } from "../../core/db.ts";

export const PLAN_TEMPLATE = `## Context

<!-- Why are we doing this? What problem does it solve? Design decisions, tradeoffs, links to prior art. -->

## Goals

<!-- What does "done" look like? Success criteria, scope boundaries, acceptance criteria. -->

## Reviews

<!-- Reviews appended here by agent and humans. -->

## Verification

<!-- Concrete commands and expected outputs that confirm successful execution. -->

## Implementation

<!-- Step-by-step agent instructions. -->

### Step 1:

**Files:** \`\` (create)

<!-- Describe what to do. -->
`;

export async function cmdNew(
  slug: string | undefined,
  opts: {
    title?: string;
    repo?: string;
    tags?: string;
    author?: string;
    owner?: string;
    parent?: string;
  }
): Promise<void> {
  if (!slug) {
    console.error("Missing required argument: <slug>");
    console.error("Usage: pf new <slug> --title <title> [--repo <path>] [--tags <a,b>] [--owner <name>] [--parent <slug>]");
    process.exit(1);
  }
  if (!opts.title) {
    console.error("Missing required option: --title <title>");
    console.error("Usage: pf new <slug> --title <title>");
    process.exit(1);
  }
  if (!slug.match(/^[a-z0-9-]+$/)) {
    console.error("Slug must be lowercase letters, numbers, and hyphens only.");
    process.exit(1);
  }
  if (planExists(slug)) {
    console.error(`Plan already exists: ${slug}`);
    process.exit(1);
  }
  if (opts.parent && !planExists(opts.parent)) {
    console.error(`Parent plan not found: ${opts.parent}`);
    process.exit(1);
  }

  await ensureStore();
  await mkdir(planDir(slug), { recursive: true });

  const repos = opts.repo ? [opts.repo] : [];
  const tags = opts.tags ? opts.tags.split(",").map((t) => t.trim()).filter(Boolean) : [];
  const meta = newMeta(slug, opts.title, opts.author ?? "agent", repos, tags, {
    owner: opts.owner,
    parent: opts.parent,
  });

  await writeMeta(meta);
  await Bun.write(planPath(slug), PLAN_TEMPLATE);

  if (opts.parent) {
    await addChild(opts.parent, slug);
    console.log(`Created: ${slug} (child of ${opts.parent})`);
  } else {
    console.log(`Created: ${slug}`);
  }

  try { initDb(); await indexPlan(slug); } catch {}
  console.log(`  ${planPath(slug)}`);
}

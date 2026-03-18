import { mkdir } from "fs/promises";
import { planDir, planPath, planExists, ensureStore } from "../../core/store.ts";
import { newMeta, writeMeta, addChild, readMeta } from "../../core/meta.ts";
import { indexPlan, initDb } from "../../core/db.ts";
import { currentRepo } from "../../core/git.ts";
import { intro, text, outro, cancel } from "@clack/prompts";

const PLAN_TEMPLATE = `## Context

<!-- Why are we doing this? What problem does it solve? Design decisions, tradeoffs, links to prior art. -->

## Goals

- [ ] <!-- success criterion -->

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
  // If all required args are present (agent mode), skip prompts
  if (slug && opts.title) {
    return runNew(slug, opts.title, opts);
  }

  // Interactive mode
  intro("New plan");

  const resolvedSlug = slug ?? await (async () => {
    const r = await text({
      message: "Slug:",
      placeholder: "auth-migration-oauth2",
      validate: (v) => {
        if (!v.match(/^[a-z0-9-]+$/)) return "Lowercase letters, numbers, hyphens only";
        if (planExists(v)) return `Plan already exists: ${v}`;
      },
    });
    if (typeof r !== "string") { cancel("Cancelled."); process.exit(0); }
    return r;
  })();

  const resolvedTitle = opts.title ?? await (async () => {
    const r = await text({ message: "Title:", placeholder: "Auth Migration to OAuth2" });
    if (typeof r !== "string" || !r.trim()) { cancel("Cancelled."); process.exit(0); }
    return r.trim();
  })();

  const detectedRepo = await currentRepo() ?? "";
  const resolvedRepo = opts.repo ?? await (async () => {
    const r = await text({
      message: "Repo path:",
      placeholder: detectedRepo || "leave blank to skip",
      initialValue: detectedRepo,
    });
    return typeof r === "string" ? r.trim() : "";
  })();

  const resolvedTags = opts.tags ?? await (async () => {
    const r = await text({
      message: "Tags (comma-separated):",
      placeholder: "auth, migration",
    });
    return typeof r === "string" ? r.trim() : "";
  })();

  outro(`Creating plan: ${resolvedSlug}`);

  await runNew(resolvedSlug, resolvedTitle, {
    repo: resolvedRepo || undefined,
    tags: resolvedTags || undefined,
    author: opts.author,
    owner: opts.owner,
    parent: opts.parent,
  });
}

async function runNew(
  slug: string,
  title: string,
  opts: { repo?: string; tags?: string; author?: string; owner?: string; parent?: string }
): Promise<void> {
  if (!slug.match(/^[a-z0-9-]+$/)) {
    console.error("Slug must be lowercase letters, numbers, and hyphens only.");
    process.exit(1);
  }
  if (planExists(slug)) {
    console.error(`Plan already exists: ${slug}`);
    process.exit(1);
  }

  await ensureStore();
  await mkdir(planDir(slug), { recursive: true });

  // Validate parent exists if provided
  if (opts.parent && !planExists(opts.parent)) {
    console.error(`Parent plan not found: ${opts.parent}`);
    process.exit(1);
  }

  const repos = opts.repo ? [opts.repo] : [];
  const tags = opts.tags ? opts.tags.split(",").map((t) => t.trim()).filter(Boolean) : [];
  const meta = newMeta(slug, title, opts.author ?? "agent", repos, tags, {
    owner: opts.owner,
    parent: opts.parent,
  });

  await writeMeta(meta);
  await Bun.write(planPath(slug), PLAN_TEMPLATE);

  // Wire parent ↔ child
  if (opts.parent) {
    await addChild(opts.parent, slug);
    console.log(`Created: ${slug} (child of ${opts.parent})`);
  } else {
    console.log(`Created: ${slug}`);
  }

  try { initDb(); await indexPlan(slug); } catch {}

  console.log(`  ${planPath(slug)}`);
}

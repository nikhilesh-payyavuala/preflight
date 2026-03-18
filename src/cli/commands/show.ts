import { readMeta } from "../../core/meta.ts";
import { planPath, planExists } from "../../core/store.ts";
import { resolveSlug } from "../interactive.ts";
import { STATUS_COLOR, RESET } from "../format.ts";

// In brief mode, only print up to and including the ## Reviews section
function extractBrief(content: string): string {
  const lines = content.split("\n");
  const implementationIdx = lines.findIndex(
    (l) => l.match(/^## Implementation/i)
  );
  if (implementationIdx === -1) return content;
  return lines.slice(0, implementationIdx).join("\n").trimEnd();
}

export async function cmdShow(slug: string | undefined, opts: { brief?: boolean; json?: boolean; meta?: boolean }): Promise<void> {
  const resolved = await resolveSlug(slug, { prompt: "show> " });
  if (!resolved) process.exit(0);
  const meta = await readMeta(resolved);

  // --meta: show metadata only
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

  const color = STATUS_COLOR[meta.status] ?? "";
  console.log(`\x1b[1m${meta.title}\x1b[0m  (${meta.slug})`);
  const ownerPart = meta.owner ? `  |  Owner: ${meta.owner}` : "";
  console.log(
    `Status: ${color}${meta.status}${RESET}  |  Author: ${meta.author}${ownerPart}  |  Updated: ${meta.updated.slice(0, 10)}`
  );
  if (meta.parent) console.log(`Parent: ${meta.parent}`);
  if (meta.repos.length) console.log(`Repos: ${meta.repos.join(", ")}`);
  if (meta.tags.length) console.log(`Tags: ${meta.tags.join(", ")}`);
  if (meta.children.length) {
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
  console.log("");

  const body = opts.brief ? extractBrief(content) : content;
  console.log(body);
}

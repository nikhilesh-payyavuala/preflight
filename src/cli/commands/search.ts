import { DB_PATH, listSlugs } from "../../core/store.ts";
import { readMeta } from "../../core/meta.ts";
import { existsSync } from "fs";
import { rebuildIndex, searchPlans } from "../../core/db.ts";
import { STATUS_COLOR, RESET } from "../format.ts";

export async function cmdSearch(
  query: string | undefined,
  opts: { limit?: number; json?: boolean; status?: string; repo?: string; tag?: string; owner?: string; plain?: boolean }
): Promise<void> {
  // No query = list all plans
  if (!query) {
    const slugs = await listSlugs();
    if (slugs.length === 0) {
      console.log("No plans found. Run `pf new` to create one.");
      return;
    }

    const results = await Promise.all(slugs.map((s) => readMeta(s).catch(() => null)));
    const metas = results.filter((m) => m !== null);
    let filtered = metas;

    if (opts.status) filtered = filtered.filter((m) => m.status === opts.status);
    if (opts.repo) {
      const repo = opts.repo === "." ? process.cwd() : opts.repo;
      filtered = filtered.filter((m) => m.repos.some((r) => r === repo));
    }
    if (opts.tag) filtered = filtered.filter((m) => m.tags.includes(opts.tag!));
    if (opts.owner) filtered = filtered.filter((m) => m.owner === opts.owner);

    if (opts.json) {
      console.log(JSON.stringify(filtered, null, 2));
      return;
    }

    if (filtered.length === 0) {
      console.log("No plans match the given filters.");
      return;
    }

    for (const meta of filtered) {
      const color = STATUS_COLOR[meta.status] ?? "";
      const tags = meta.tags.length ? `  [${meta.tags.join(", ")}]` : "";
      console.log(`${color}${meta.status.padEnd(10)}${RESET}  ${meta.slug}  —  ${meta.title}${tags}`);
    }
    return;
  }

  // Query provided = FTS search
  if (!existsSync(DB_PATH)) {
    console.log("Index not found — building now...");
    await rebuildIndex();
  }

  const searchResults = searchPlans(query, opts.limit ?? 20);

  if (searchResults.length === 0) {
    console.log(`No plans match: "${query}"`);
    return;
  }

  if (opts.json) {
    console.log(JSON.stringify(searchResults, null, 2));
    return;
  }

  for (const r of searchResults) {
    console.log(`${r.slug}  —  ${r.title}`);
  }
}

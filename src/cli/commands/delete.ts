import { planDir, planExists, DB_PATH } from "../../core/store.ts";
import { removePlanFromIndex } from "../../core/db.ts";
import { rm } from "fs/promises";
import { existsSync } from "fs";
import { resolveSlug } from "../interactive.ts";
import { confirm } from "@clack/prompts";

export async function cmdDelete(slug: string | undefined, opts: { force?: boolean }): Promise<void> {
  const resolved = await resolveSlug(slug, { prompt: "delete> " });
  if (!resolved) process.exit(0);

  if (!planExists(resolved)) {
    console.error(`Plan not found: ${resolved}`);
    process.exit(1);
  }

  if (!opts.force) {
    const ok = await confirm({ message: `Delete plan "${resolved}"? This cannot be undone.` });
    if (!ok) { console.log("Aborted."); process.exit(0); }
  }

  await rm(planDir(resolved), { recursive: true, force: true });

  if (existsSync(DB_PATH)) {
    try { removePlanFromIndex(resolved); } catch {}
  }

  console.log(`Deleted: ${resolved}`);
}

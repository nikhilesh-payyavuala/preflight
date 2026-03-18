import { planDir, planExists, DB_PATH } from "../../core/store.ts";
import { removePlanFromIndex } from "../../core/db.ts";
import { rm } from "fs/promises";
import { existsSync } from "fs";

export async function cmdDelete(slug: string | undefined, opts: { force?: boolean }): Promise<void> {
  if (!slug) {
    console.error("Missing required argument: <slug>");
    console.error("Usage: pf delete <slug> [-f]");
    process.exit(1);
  }
  if (!planExists(slug)) {
    console.error(`Plan not found: ${slug}`);
    process.exit(1);
  }
  if (!opts.force) {
    console.error("Use -f to confirm deletion: pf delete <slug> -f");
    process.exit(1);
  }

  await rm(planDir(slug), { recursive: true, force: true });

  if (existsSync(DB_PATH)) {
    try { removePlanFromIndex(slug); } catch {}
  }

  console.log(`Deleted: ${slug}`);
}

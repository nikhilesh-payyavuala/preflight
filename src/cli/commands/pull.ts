import { PREFLIGHT_DIR } from "../../core/store.ts";
import { rebuildIndex, initDb } from "../../core/db.ts";
import { existsSync } from "fs";

export async function cmdPull(): Promise<void> {
  const gitDir = `${PREFLIGHT_DIR}/.git`;
  if (!existsSync(gitDir)) {
    console.error("Not a git repo. Run `pf init` or `pf init <url>` first.");
    process.exit(1);
  }

  try {
    await Bun.$`git -C ${PREFLIGHT_DIR} remote get-url origin`.quiet();
  } catch {
    console.error("No remote configured. Add one with:");
    console.error(`  git -C ${PREFLIGHT_DIR} remote add origin <url>`);
    process.exit(1);
  }

  await Bun.$`git -C ${PREFLIGHT_DIR} pull`.quiet();

  // Rebuild index from pulled plans
  initDb();
  await rebuildIndex();

  console.log("Plans pulled and index rebuilt.");
}

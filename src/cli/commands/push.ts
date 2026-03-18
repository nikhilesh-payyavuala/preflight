import { PREFLIGHT_DIR } from "../../core/store.ts";
import { existsSync } from "fs";

export async function cmdPush(opts: { message?: string }): Promise<void> {
  const gitDir = `${PREFLIGHT_DIR}/.git`;
  if (!existsSync(gitDir)) {
    console.error("Not a git repo. Run `pf init` first.");
    process.exit(1);
  }

  // Check if remote exists
  try {
    await Bun.$`git -C ${PREFLIGHT_DIR} remote get-url origin`.quiet();
  } catch {
    console.error("No remote configured. Add one with:");
    console.error(`  git -C ${PREFLIGHT_DIR} remote add origin <url>`);
    process.exit(1);
  }

  // Stage all changes
  await Bun.$`git -C ${PREFLIGHT_DIR} add -A`.quiet();

  // Check if there's anything to commit
  const status = await Bun.$`git -C ${PREFLIGHT_DIR} status --porcelain`.quiet();
  const changes = status.stdout.toString().trim();

  if (!changes) {
    console.log("No changes to push.");
    return;
  }

  // Auto-commit
  const msg = opts.message ?? `pf: update plans (${new Date().toISOString().slice(0, 10)})`;
  await Bun.$`git -C ${PREFLIGHT_DIR} commit -m ${msg}`.quiet();

  // Push
  await Bun.$`git -C ${PREFLIGHT_DIR} push`.quiet();

  console.log("Plans pushed.");
}

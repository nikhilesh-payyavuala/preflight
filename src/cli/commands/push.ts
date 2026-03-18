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

  // Commit if there are staged changes
  const status = await Bun.$`git -C ${PREFLIGHT_DIR} status --porcelain`.quiet();
  const changes = status.stdout.toString().trim();

  if (changes) {
    const msg = opts.message ?? `pf: update plans (${new Date().toISOString().slice(0, 10)})`;
    await Bun.$`git -C ${PREFLIGHT_DIR} commit -m ${msg}`.quiet();
  }

  // Push (even if no new commit — there may be unpushed commits)
  try {
    const result = await Bun.$`git -C ${PREFLIGHT_DIR} push 2>&1`.quiet();
    const output = result.stdout.toString().trim();
    if (output.includes("Everything up-to-date")) {
      console.log("Already up to date.");
    } else {
      console.log("Plans pushed.");
    }
  } catch (e: any) {
    // First push may need -u
    await Bun.$`git -C ${PREFLIGHT_DIR} push -u origin HEAD`.quiet();
    console.log("Plans pushed.");
  }
}

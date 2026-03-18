import { ensureStore, CONFIG_PATH, PREFLIGHT_DIR, PLANS_DIR } from "../../core/store.ts";
import { existsSync } from "fs";
import { initDb, rebuildIndex } from "../../core/db.ts";

const DEFAULT_CONFIG = `# Preflight configuration
editor: $EDITOR
default_author: agent
`;

const GITIGNORE = `# Derived index — rebuilt from plan files
index.db
`;

export async function cmdInit(url: string | undefined, opts: { path?: string }): Promise<void> {
  const targetDir = opts.path
    ? opts.path.replace(/^~/, process.env.HOME ?? "~")
    : PREFLIGHT_DIR;

  if (url) {
    // Clone a remote planning repo
    if (existsSync(targetDir)) {
      console.error(`Directory already exists: ${targetDir}`);
      console.error("Remove it first or use a different --path.");
      process.exit(1);
    }

    console.log(`Cloning ${url} → ${targetDir}`);
    await Bun.$`git clone ${url} ${targetDir}`.quiet();

    // Rebuild the search index from cloned plans
    initDb();
    await rebuildIndex();

    console.log(`Preflight cloned to ${targetDir}`);
    if (targetDir !== PREFLIGHT_DIR) {
      console.log(`\nSet PREFLIGHT_HOME to use this location:`);
      console.log(`  export PREFLIGHT_HOME="${targetDir.replace("/.preflight", "")}"`);
    }
    return;
  }

  // Local init — create store + git repo
  await ensureStore();

  if (!existsSync(CONFIG_PATH)) {
    await Bun.write(CONFIG_PATH, DEFAULT_CONFIG);
  }

  // Initialize git if not already a repo
  const gitDir = `${targetDir}/.git`;
  if (!existsSync(gitDir)) {
    await Bun.$`git -C ${targetDir} init`.quiet();
    // Add .gitignore for index.db
    const gitignorePath = `${targetDir}/.gitignore`;
    if (!existsSync(gitignorePath)) {
      await Bun.write(gitignorePath, GITIGNORE);
    }
    console.log(`Preflight initialized at ${targetDir} (git repo)`);
  } else {
    console.log(`Preflight initialized at ${targetDir}`);
  }

  initDb();
}

import { ensureStore, CONFIG_PATH, PREFLIGHT_DIR, PLANS_DIR } from "../../core/store.ts";
import { existsSync } from "fs";
import { initDb, rebuildIndex } from "../../core/db.ts";
import { intro, outro, select, text, confirm, cancel } from "@clack/prompts";

const DEFAULT_CONFIG = `# Preflight configuration
editor: $EDITOR
default_author: agent
`;

const GITIGNORE = `# Derived index — rebuilt from plan files
index.db
`;

export async function cmdInit(url: string | undefined, opts: { path?: string }): Promise<void> {
  // Non-interactive: clone from URL
  if (url) {
    await cloneRepo(url, opts.path);
    return;
  }

  // Already initialized — just ensure db
  if (existsSync(PREFLIGHT_DIR) && existsSync(`${PREFLIGHT_DIR}/.git`)) {
    initDb();
    console.log(`Preflight already initialized at ${PREFLIGHT_DIR}`);
    return;
  }

  // Non-TTY: basic init without prompts
  if (!process.stdout.isTTY) {
    await basicInit();
    return;
  }

  // Interactive setup
  intro("Preflight Setup");

  const action = await select({
    message: "How do you want to set up Preflight?",
    options: [
      { value: "new", label: "Create a new planning repo" },
      { value: "clone", label: "Clone an existing planning repo" },
    ],
  });
  if (typeof action !== "string") { cancel("Cancelled."); process.exit(0); }

  if (action === "clone") {
    const repoUrl = await text({
      message: "Repository URL:",
      placeholder: "https://github.com/org/plans.git",
    });
    if (typeof repoUrl !== "string" || !repoUrl.trim()) { cancel("Cancelled."); process.exit(0); }

    await cloneRepo(repoUrl.trim(), opts.path);
    outro("Done! Run `pf show` to browse your plans.");
    return;
  }

  // Create new
  await ensureStore();

  if (!existsSync(CONFIG_PATH)) {
    await Bun.write(CONFIG_PATH, DEFAULT_CONFIG);
  }

  // Git init
  if (!existsSync(`${PREFLIGHT_DIR}/.git`)) {
    await Bun.$`git -C ${PREFLIGHT_DIR} init`.quiet();
    const gitignorePath = `${PREFLIGHT_DIR}/.gitignore`;
    if (!existsSync(gitignorePath)) {
      await Bun.write(gitignorePath, GITIGNORE);
    }
    // Initial commit
    await Bun.$`git -C ${PREFLIGHT_DIR} add -A`.quiet();
    await Bun.$`git -C ${PREFLIGHT_DIR} commit -m "Initialize preflight planning repo"`.quiet();
  }

  initDb();

  // Offer to create a GitHub repo
  const createRemote = await confirm({
    message: "Create a GitHub repo to sync plans across machines?",
  });

  if (createRemote) {
    // Fetch user + orgs to let user pick where to create the repo
    let owner = "";
    try {
      const userResult = await Bun.$`gh api /user --jq '.login'`.quiet();
      const username = userResult.stdout.toString().trim();
      const orgsResult = await Bun.$`gh api /user/orgs --jq '.[].login'`.quiet();
      const orgs = orgsResult.stdout.toString().trim().split("\n").filter(Boolean);

      const ownerOptions = [
        { value: username, label: `${username} (personal)` },
        ...orgs.map((org) => ({ value: org, label: org })),
      ];

      if (ownerOptions.length > 1) {
        const picked = await select({ message: "Create repo under:", options: ownerOptions });
        if (typeof picked !== "string") { cancel("Cancelled."); process.exit(0); }
        owner = picked;
      } else {
        owner = username;
      }
    } catch {
      // gh not authenticated or no orgs — just use default
    }

    const visibility = await select({
      message: "Repository visibility:",
      options: [
        { value: "private", label: "Private" },
        { value: "public", label: "Public" },
      ],
    });
    if (typeof visibility !== "string") { cancel("Cancelled."); process.exit(0); }

    const defaultName = "preflight-plans";
    const repoName = await text({
      message: "Repository name:",
      initialValue: defaultName,
      placeholder: defaultName,
    });
    if (typeof repoName !== "string" || !repoName.trim()) { cancel("Cancelled."); process.exit(0); }

    try {
      const visFlag = visibility === "public" ? "--public" : "--private";
      const fullName = owner ? `${owner}/${repoName.trim()}` : repoName.trim();
      const result = await Bun.$`gh repo create ${fullName} ${visFlag} --source=${PREFLIGHT_DIR} --push --description "Preflight planning repo"`.quiet();
      const output = result.stdout.toString().trim();
      console.log(`  Created: ${output}`);
    } catch (e: any) {
      console.error(`  Failed to create repo: ${e.message ?? e}`);
      console.error("  You can add a remote manually:");
      console.error(`    git -C ${PREFLIGHT_DIR} remote add origin <url>`);
    }
  }

  outro(`Preflight initialized at ${PREFLIGHT_DIR}`);
}

async function basicInit(): Promise<void> {
  await ensureStore();
  if (!existsSync(CONFIG_PATH)) await Bun.write(CONFIG_PATH, DEFAULT_CONFIG);
  if (!existsSync(`${PREFLIGHT_DIR}/.git`)) {
    await Bun.$`git -C ${PREFLIGHT_DIR} init`.quiet();
    if (!existsSync(`${PREFLIGHT_DIR}/.gitignore`)) {
      await Bun.write(`${PREFLIGHT_DIR}/.gitignore`, GITIGNORE);
    }
    await Bun.$`git -C ${PREFLIGHT_DIR} add -A`.quiet();
    await Bun.$`git -C ${PREFLIGHT_DIR} commit -m "Initialize preflight planning repo"`.quiet();
  }
  initDb();
  console.log(`Preflight initialized at ${PREFLIGHT_DIR}`);
}

async function cloneRepo(url: string, customPath?: string): Promise<void> {
  const targetDir = customPath
    ? customPath.replace(/^~/, process.env.HOME ?? "~")
    : PREFLIGHT_DIR;

  if (existsSync(targetDir)) {
    console.error(`Directory already exists: ${targetDir}`);
    console.error("Remove it first or use a different --path.");
    process.exit(1);
  }

  console.log(`Cloning ${url} → ${targetDir}`);
  await Bun.$`git clone ${url} ${targetDir}`.quiet();

  initDb();
  await rebuildIndex();

  console.log(`Preflight cloned to ${targetDir}`);
  if (targetDir !== PREFLIGHT_DIR) {
    console.log(`\nSet PREFLIGHT_HOME to use this location:`);
    console.log(`  export PREFLIGHT_HOME="${targetDir.replace("/.preflight", "")}"`);
  }
}

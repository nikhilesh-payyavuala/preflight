import { join } from "path";
import { existsSync } from "fs";
import { symlink, mkdir } from "fs/promises";
import { multiselect, intro, outro, cancel, note } from "@clack/prompts";

const HOME = process.env.HOME ?? "~";
const CONFIG_HOME = process.env.XDG_CONFIG_HOME ?? join(HOME, ".config");
const CODEX_HOME = process.env.OPENAI_CODEX_HOME ?? join(HOME, ".codex");

// Full agent list mirroring the `skills` package, with detect checks.
// name must match what `bunx skills add --agent <name>` accepts.
const AGENTS: { id: string; label: string; globalDir: string }[] = [
  { id: "claude-code",    label: "Claude Code",     globalDir: join(HOME, ".claude", "skills") },
  { id: "cursor",         label: "Cursor",           globalDir: join(HOME, ".cursor", "skills") },
  { id: "codex",          label: "Codex",            globalDir: join(CODEX_HOME, "skills") },
  { id: "gemini-cli",     label: "Gemini CLI",       globalDir: join(HOME, ".gemini", "antigravity", "skills") },
  { id: "goose",          label: "Goose",            globalDir: join(CONFIG_HOME, "goose", "skills") },
  { id: "opencode",       label: "OpenCode",         globalDir: join(CONFIG_HOME, "opencode", "skills") },
  { id: "cline",          label: "Cline",            globalDir: join(HOME, ".agents", "skills") },
  { id: "warp",           label: "Warp",             globalDir: join(HOME, ".warp", "skills") },
  { id: "windsurf",       label: "Windsurf",         globalDir: join(HOME, ".codeium", "windsurf", "skills") },
  { id: "roo",            label: "Roo Code",         globalDir: join(HOME, ".agents", "skills") },
  { id: "continue",       label: "Continue",         globalDir: join(HOME, ".continue", "skills") },
  { id: "augment",        label: "Augment",          globalDir: join(HOME, ".augment", "skills") },
  { id: "amp",            label: "Amp",              globalDir: join(CONFIG_HOME, "agents", "skills") },
  { id: "kiro-cli",       label: "Kiro",             globalDir: join(HOME, ".kiro", "skills") },
  { id: "github-copilot", label: "GitHub Copilot",   globalDir: join(HOME, ".github-copilot", "skills") },
  { id: "universal",      label: "Universal (~/.agents/skills)", globalDir: join(HOME, ".agents", "skills") },
];

function isInstalled(agent: typeof AGENTS[0]): boolean {
  // Consider "installed" if the parent config dir exists (not the skills subdir specifically)
  const parent = join(agent.globalDir, "..", "..");
  return existsSync(parent) || existsSync(agent.globalDir);
}

async function skillsCliAvailable(): Promise<boolean> {
  try {
    await Bun.$`bunx skills --version`.quiet();
    return true;
  } catch {
    return false;
  }
}

async function installViaSkillsCli(repoRoot: string, agentIds: string[]): Promise<void> {
  const args = ["bunx", "skills", "add", repoRoot, "--global", "--yes"];
  for (const id of agentIds) args.push("--agent", id);
  const proc = Bun.spawn(args, { stdin: "inherit", stdout: "inherit", stderr: "inherit" });
  const code = await proc.exited;
  if (code !== 0) throw new Error(`skills add exited with code ${code}`);
}

async function installViaSymlinks(skillsDir: string, targetDir: string): Promise<string[]> {
  const installed: string[] = [];
  if (!existsSync(targetDir)) {
    try { await mkdir(targetDir, { recursive: true }); } catch { return []; }
  }
  const { readdir } = await import("fs/promises");
  const entries = await readdir(skillsDir, { withFileTypes: true }).catch(() => []);
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const target = join(targetDir, entry.name);
    if (existsSync(target)) continue;
    try { await symlink(join(skillsDir, entry.name), target); installed.push(entry.name); } catch {}
  }
  return installed;
}

export async function cmdInstallSkills(opts: {
  all?: boolean;
  agent?: string;
  fallback?: boolean;
}): Promise<void> {
  const repoRoot = join(import.meta.dir, "..", "..", "..");
  const skillsDir = join(repoRoot, "skills");

  if (!existsSync(skillsDir)) {
    console.error(`Skills directory not found: ${skillsDir}`);
    process.exit(1);
  }

  const hasCli = !opts.fallback && await skillsCliAvailable();

  // --all: skip picker, install everywhere
  if (opts.all) {
    if (hasCli) {
      await installViaSkillsCli(repoRoot, ["universal"]);
    } else {
      await installViaSymlinks(skillsDir, join(HOME, ".agents", "skills"));
      await installViaSymlinks(skillsDir, join(HOME, ".claude", "skills"));
    }
    return;
  }

  // --agent <name>: non-interactive single agent
  if (opts.agent) {
    if (hasCli) {
      await installViaSkillsCli(repoRoot, [opts.agent]);
    } else {
      const agent = AGENTS.find((a) => a.id === opts.agent);
      if (!agent) { console.error(`Unknown agent: ${opts.agent}`); process.exit(1); }
      await installViaSymlinks(skillsDir, agent.globalDir);
    }
    return;
  }

  // Interactive: show multiselect picker
  intro("Install Preflight skills");

  const detected = AGENTS.filter(isInstalled);
  const undetected = AGENTS.filter((a) => !isInstalled(a));

  const options = [
    ...detected.map((a) => ({
      value: a.id,
      label: a.label,
      hint: "detected",
    })),
    ...undetected.map((a) => ({
      value: a.id,
      label: a.label,
      hint: "not detected",
    })),
  ];

  const selected = await multiselect({
    message: "Select agents to install skills into:",
    options,
    initialValues: detected.map((a) => a.id),
    required: true,
  });

  if (typeof selected === "symbol") { cancel("Cancelled."); process.exit(0); }

  const agentIds = selected as string[];

  if (hasCli) {
    note(`Installing to: ${agentIds.join(", ")}`, "via skills CLI");
    await installViaSkillsCli(repoRoot, agentIds);
  } else {
    note("skills CLI not found — using symlinks", "fallback");
    for (const id of agentIds) {
      const agent = AGENTS.find((a) => a.id === id)!;
      const names = await installViaSymlinks(skillsDir, agent.globalDir);
      if (names.length > 0) {
        console.log(`  ✓ ${agent.label} → ${agent.globalDir}`);
      } else {
        console.log(`  ~ ${agent.label} already up to date`);
      }
    }
    outro(`Done. Install \`skills\` (bunx skills) for richer output and more IDEs.`);
  }
}

import { join } from "path";
import { mkdir, readdir } from "fs/promises";
import { existsSync } from "fs";

export const PREFLIGHT_DIR = join(
  process.env.PREFLIGHT_HOME ?? process.env.HOME ?? "~",
  ".preflight"
);

export const PLANS_DIR = join(PREFLIGHT_DIR, "plans");
export const CONFIG_PATH = join(PREFLIGHT_DIR, "config.yml");
export const DB_PATH = join(PREFLIGHT_DIR, "index.db");

export function planDir(slug: string): string {
  return join(PLANS_DIR, slug);
}

export function planPath(slug: string): string {
  return join(PLANS_DIR, slug, "plan.md");
}

export function metaPath(slug: string): string {
  return join(PLANS_DIR, slug, "meta.yml");
}

export async function ensureStore(): Promise<void> {
  await mkdir(PLANS_DIR, { recursive: true });
}

export function planExists(slug: string): boolean {
  return existsSync(planDir(slug));
}

export async function listSlugs(): Promise<string[]> {
  if (!existsSync(PLANS_DIR)) return [];
  const entries = await readdir(PLANS_DIR, { withFileTypes: true });
  return entries
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort();
}

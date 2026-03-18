import { parse, stringify } from "yaml";
import type { PlanMeta, PlanStatus } from "../types/index.ts";
import { metaPath, planExists } from "./store.ts";

export async function readMeta(slug: string): Promise<PlanMeta> {
  const path = metaPath(slug);
  const file = Bun.file(path);
  if (!(await file.exists())) {
    throw new Error(`Plan not found: ${slug}`);
  }
  const text = await file.text();
  return parse(text) as PlanMeta;
}

export async function writeMeta(meta: PlanMeta): Promise<void> {
  const path = metaPath(meta.slug);
  await Bun.write(path, stringify(meta));
}

export function newMeta(
  slug: string,
  title: string,
  author = "agent",
  repos: string[] = [],
  tags: string[] = [],
  opts: { owner?: string; parent?: string } = {}
): PlanMeta {
  const now = new Date().toISOString();
  return {
    slug,
    title,
    status: "draft",
    created: now,
    updated: now,
    author,
    owner: opts.owner ?? "",
    repos,
    tags,
    prs: [],
    parent: opts.parent ?? null,
    children: [],
    "depends-on": [],
  };
}

export async function addChild(parentSlug: string, childSlug: string): Promise<void> {
  const parent = await readMeta(parentSlug);
  if (!parent.children.includes(childSlug)) {
    parent.children.push(childSlug);
    parent.updated = new Date().toISOString();
    await writeMeta(parent);
  }
}

export async function removeChild(parentSlug: string, childSlug: string): Promise<void> {
  const parent = await readMeta(parentSlug);
  parent.children = parent.children.filter((c) => c !== childSlug);
  parent.updated = new Date().toISOString();
  await writeMeta(parent);
}

export async function updateMeta(
  slug: string,
  patch: Partial<PlanMeta>
): Promise<PlanMeta> {
  const meta = await readMeta(slug);
  const updated = { ...meta, ...patch, updated: new Date().toISOString() };
  await writeMeta(updated);
  return updated;
}

import { parse, stringify } from "yaml";
import type { PlanMeta, PlanStatus, StepStatus } from "../types/index.ts";
import { metaPath, planPath, planExists } from "./store.ts";
import { extractSteps, syncSteps } from "./steps.ts";

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
    steps: [],
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

export async function syncStepsFromContent(slug: string): Promise<void> {
  const meta = await readMeta(slug);
  const file = Bun.file(planPath(slug));
  if (!(await file.exists())) return;
  const content = await file.text();
  const titles = extractSteps(content);
  if (titles.length === 0 && meta.steps.length === 0) return;
  meta.steps = syncSteps(meta.steps ?? [], titles);
  meta.updated = new Date().toISOString();
  await writeMeta(meta);
}

export async function updateStepStatus(
  slug: string,
  stepNumber: number,
  status: StepStatus
): Promise<void> {
  const meta = await readMeta(slug);
  const idx = stepNumber - 1; // 1-indexed input
  if (idx < 0 || idx >= (meta.steps?.length ?? 0)) {
    throw new Error(`Step ${stepNumber} does not exist. Plan has ${meta.steps?.length ?? 0} steps.`);
  }
  meta.steps[idx].status = status;
  meta.updated = new Date().toISOString();
  await writeMeta(meta);
}

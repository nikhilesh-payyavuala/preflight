import { readMeta, writeMeta, syncStepsFromContent, updateStepStatus } from "../../core/meta.ts";
import { indexPlan } from "../../core/db.ts";
import { planPath, planExists } from "../../core/store.ts";
import { currentRepo } from "../../core/git.ts";
import { resolveSlug } from "../interactive.ts";
import { select, text } from "@clack/prompts";
import type { PlanMeta, PlanStatus } from "../../types/index.ts";
import { writeFileSync, unlinkSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

const VALID_STATUSES: PlanStatus[] = [
  "draft",
  "in-review",
  "approved",
  "executing",
  "completed",
  "archived",
  "rejected",
];

// --- Prompting helpers ---

async function promptReviewBody(): Promise<string | null> {
  const editor = process.env.EDITOR ?? process.env.VISUAL ?? null;

  if (editor) {
    const tmpFile = join(tmpdir(), `pf-review-${Date.now()}.md`);
    writeFileSync(tmpFile, "\n\n# Write your review above this line. Save and close to submit.\n");
    await Bun.$`${editor} ${tmpFile}`;
    const raw = await Bun.file(tmpFile).text();
    unlinkSync(tmpFile);
    const body = raw.replace(/\n# Write your review.*$/s, "").trim();
    return body || null;
  }

  const result = await text({ message: "Review body:" });
  return typeof result === "string" ? result.trim() || null : null;
}

async function resolveReview(opts: { review?: string; by?: string }): Promise<{ by: string; body: string } | null> {
  if (opts.review === undefined && !opts.by) return null;

  let by = opts.by;
  if (!by) {
    const result = await text({ message: "Reviewer name:", placeholder: "your name or 'claude'" });
    if (typeof result !== "string" || !result.trim()) process.exit(0);
    by = result.trim();
  }

  let body = opts.review;
  if (!body) {
    body = await promptReviewBody() ?? undefined;
    if (!body) { console.log("Aborted — empty review."); process.exit(0); }
  }

  return { by, body };
}

async function resolveStatus(opts: { status?: string }, hasOtherChanges: boolean): Promise<PlanStatus | null> {
  let status = opts.status;

  if (!status && !hasOtherChanges) {
    const chosen = await select({
      message: "New status:",
      options: VALID_STATUSES.map((s) => ({ value: s, label: s })),
    });
    if (typeof chosen !== "string") process.exit(0);
    status = chosen;
  }

  if (status && !VALID_STATUSES.includes(status as PlanStatus)) {
    console.error(`Invalid status: ${status}. Valid: ${VALID_STATUSES.join(", ")}`);
    process.exit(1);
  }

  return (status as PlanStatus) ?? null;
}

// --- Content mutation ---

function appendReview(content: string, by: string, body: string): string {
  const date = new Date().toISOString().slice(0, 10);
  const entry = `\n**${date} — ${by}:**\n${body}\n`;

  const reviewsMatch = content.match(/(## Reviews\s*\n)([\s\S]*?)((?=\n## )|\s*$)/);
  if (reviewsMatch) {
    return content.replace(reviewsMatch[0], `${reviewsMatch[1]}${reviewsMatch[2]}${entry}`);
  }

  const insertBefore = content.match(/\n## Verification/);
  if (insertBefore) {
    return content.replace(/(\n## Verification)/, `\n## Reviews\n${entry}\n$1`);
  }

  return content + `\n## Reviews\n${entry}`;
}

// --- Meta mutation ---

function applyMetaPatch(
  meta: PlanMeta,
  patch: {
    status?: PlanStatus | null;
    title?: string;
    owner?: string;
    addRepo?: string;
    removeRepo?: string;
    addTag?: string;
    removeTag?: string;
    addPr?: { repo: string; number: number };
  }
): PlanMeta {
  const updated = { ...meta };

  if (patch.status) updated.status = patch.status;
  if (patch.title) updated.title = patch.title;
  if (patch.owner !== undefined) updated.owner = patch.owner;
  if (patch.addRepo && !updated.repos.includes(patch.addRepo)) updated.repos = [...updated.repos, patch.addRepo];
  if (patch.removeRepo) updated.repos = updated.repos.filter((r) => r !== patch.removeRepo);
  if (patch.addTag && !updated.tags.includes(patch.addTag)) updated.tags = [...updated.tags, patch.addTag];
  if (patch.removeTag) updated.tags = updated.tags.filter((t) => t !== patch.removeTag);
  if (patch.addPr) {
    const already = updated.prs.some((p) => p.repo === patch.addPr!.repo && p.number === patch.addPr!.number);
    if (!already) updated.prs = [...updated.prs, patch.addPr];
  }

  updated.updated = new Date().toISOString();
  return updated;
}

// --- Main command ---

export async function cmdUpdate(
  slug: string | undefined,
  opts: {
    status?: string;
    addRepo?: string;
    removeRepo?: string;
    addTag?: string;
    removeTag?: string;
    title?: string;
    owner?: string;
    addPr?: string;
    review?: string;
    by?: string;
    completeStep?: string;
    startStep?: string;
    syncSteps?: boolean;
  }
): Promise<void> {
  const resolved = await resolveSlug(slug, { prompt: "update> " });
  if (!resolved) process.exit(0);

  if (!planExists(resolved)) {
    console.error(`Plan not found: ${resolved}`);
    process.exit(1);
  }

  const messages: string[] = [];

  // 1. Collect: resolve interactive inputs before any writes
  const review = await resolveReview(opts);

  let prPatch: { repo: string; number: number } | undefined;
  if (opts.addPr) {
    const prNum = parseInt(opts.addPr);
    if (isNaN(prNum)) {
      console.error(`Invalid PR number: ${opts.addPr}`);
      process.exit(1);
    }
    const repo = await currentRepo() ?? process.cwd();
    prPatch = { repo, number: prNum };
  }

  // Handle step operations (these write directly and return early if no other changes)
  if (opts.syncSteps) {
    await syncStepsFromContent(resolved);
    messages.push(`Steps synced from plan content: ${resolved}`);
  }
  if (opts.completeStep) {
    const n = parseInt(opts.completeStep);
    if (isNaN(n)) { console.error(`Invalid step number: ${opts.completeStep}`); process.exit(1); }
    await updateStepStatus(resolved, n, "completed");
    messages.push(`Step ${n} marked completed: ${resolved}`);
  }
  if (opts.startStep) {
    const n = parseInt(opts.startStep);
    if (isNaN(n)) { console.error(`Invalid step number: ${opts.startStep}`); process.exit(1); }
    await updateStepStatus(resolved, n, "in-progress");
    messages.push(`Step ${n} marked in-progress: ${resolved}`);
  }

  const hasStepChanges = !!(opts.syncSteps || opts.completeStep || opts.startStep);
  const hasMetaChanges = !!(opts.addRepo || opts.removeRepo || opts.addTag || opts.removeTag || opts.title || opts.owner || prPatch);
  const status = await resolveStatus(opts, hasMetaChanges || !!review || hasStepChanges);

  // 2. Apply: write plan.md if review, then meta.yml once, then reindex once
  if (review) {
    const file = Bun.file(planPath(resolved));
    const content = await file.text();
    await Bun.write(planPath(resolved), appendReview(content, review.by, review.body));
    messages.push(`Review appended to: ${resolved}`);
  }

  const meta = await readMeta(resolved);
  const patched = applyMetaPatch(meta, {
    status,
    title: opts.title,
    owner: opts.owner,
    addRepo: opts.addRepo,
    removeRepo: opts.removeRepo,
    addTag: opts.addTag,
    removeTag: opts.removeTag,
    addPr: prPatch,
  });

  // Only write if something actually changed
  if (JSON.stringify(meta) !== JSON.stringify({ ...patched, updated: meta.updated })) {
    await writeMeta(patched);
  }

  if (prPatch) messages.push(`Linked PR #${prPatch.number} (${prPatch.repo}) to plan: ${resolved}`);

  try { await indexPlan(resolved); } catch {}

  messages.push(`Updated: ${resolved} (status: ${patched.status})`);
  for (const msg of messages) console.log(msg);
}

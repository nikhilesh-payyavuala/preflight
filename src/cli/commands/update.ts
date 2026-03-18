import { readMeta, writeMeta, syncStepsFromContent, updateStepStatus } from "../../core/meta.ts";
import { indexPlan } from "../../core/db.ts";
import { planPath, planExists } from "../../core/store.ts";
import { currentRepo } from "../../core/git.ts";
import type { PlanMeta, PlanStatus } from "../../types/index.ts";

const VALID_STATUSES: PlanStatus[] = [
  "draft", "in-review", "approved", "executing", "completed", "archived", "rejected",
];

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
  if (!slug) {
    console.error("Missing required argument: <slug>");
    console.error("Usage: pf update <slug> --status <status>");
    process.exit(1);
  }
  if (!planExists(slug)) {
    console.error(`Plan not found: ${slug}`);
    process.exit(1);
  }

  const messages: string[] = [];

  // Step operations
  if (opts.syncSteps) {
    await syncStepsFromContent(slug);
    messages.push(`Steps synced: ${slug}`);
  }
  if (opts.completeStep) {
    const n = parseInt(opts.completeStep);
    if (isNaN(n)) { console.error(`Invalid step number: ${opts.completeStep}`); process.exit(1); }
    await updateStepStatus(slug, n, "completed");
    messages.push(`Step ${n} completed: ${slug}`);
  }
  if (opts.startStep) {
    const n = parseInt(opts.startStep);
    if (isNaN(n)) { console.error(`Invalid step number: ${opts.startStep}`); process.exit(1); }
    await updateStepStatus(slug, n, "in-progress");
    messages.push(`Step ${n} in-progress: ${slug}`);
  }

  // Review
  if (opts.review) {
    if (!opts.by) {
      console.error("Missing --by <name> for review");
      process.exit(1);
    }
    const file = Bun.file(planPath(slug));
    const content = await file.text();
    await Bun.write(planPath(slug), appendReview(content, opts.by, opts.review));
    messages.push(`Review appended: ${slug}`);
  }

  // PR linking
  let prPatch: { repo: string; number: number } | undefined;
  if (opts.addPr) {
    const prNum = parseInt(opts.addPr);
    if (isNaN(prNum)) { console.error(`Invalid PR number: ${opts.addPr}`); process.exit(1); }
    const repo = await currentRepo() ?? process.cwd();
    prPatch = { repo, number: prNum };
  }

  // Status validation
  if (opts.status && !VALID_STATUSES.includes(opts.status as PlanStatus)) {
    console.error(`Invalid status: ${opts.status}. Valid: ${VALID_STATUSES.join(", ")}`);
    process.exit(1);
  }

  // Apply meta patch
  const meta = await readMeta(slug);
  const patched = applyMetaPatch(meta, {
    status: (opts.status as PlanStatus) ?? null,
    title: opts.title,
    owner: opts.owner,
    addRepo: opts.addRepo,
    removeRepo: opts.removeRepo,
    addTag: opts.addTag,
    removeTag: opts.removeTag,
    addPr: prPatch,
  });

  if (JSON.stringify(meta) !== JSON.stringify({ ...patched, updated: meta.updated })) {
    await writeMeta(patched);
  }

  if (prPatch) messages.push(`Linked PR #${prPatch.number} (${prPatch.repo}): ${slug}`);

  try { await indexPlan(slug); } catch {}

  messages.push(`Updated: ${slug} (status: ${patched.status})`);
  for (const msg of messages) console.log(msg);
}

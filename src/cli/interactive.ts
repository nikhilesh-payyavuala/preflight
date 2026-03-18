import { listSlugs, planExists } from "../core/store.ts";
import { readMeta } from "../core/meta.ts";
import { formatPlanLine } from "./format.ts";
import type { PlanStatus } from "../types/index.ts";

// Extract slug from a formatted plan line (3rd whitespace-separated token after icon and status)
export function extractSlugFromLine(line: string): string | null {
  const parts = line.trim().split(/\s+/);
  return parts[2] ?? null;
}

// Pipe a list of lines to fzf, return the selected line (or null if cancelled)
export async function fzfSelect(
  lines: string[],
  opts: { preview?: string; prompt?: string; header?: string } = {}
): Promise<string | null> {
  const args = ["fzf", "--ansi", "--no-sort"];
  if (opts.prompt) args.push("--prompt", opts.prompt);
  if (opts.header) args.push("--header", opts.header);
  if (opts.preview) {
    args.push(
      "--preview", opts.preview,
      "--preview-window", "right:60%:wrap"
    );
  }

  const proc = Bun.spawn(args, {
    stdin: "pipe",
    stdout: "pipe",
    stderr: "inherit",
  });

  proc.stdin.write(lines.join("\n"));
  proc.stdin.end();

  const exitCode = await proc.exited;
  if (exitCode !== 0) return null; // user cancelled with Esc/Ctrl-C

  const output = await new Response(proc.stdout).text();
  return output.trim() || null;
}

// Show an fzf picker over all plans, return selected slug or null
export async function pickPlan(opts: {
  prompt?: string;
  statusFilter?: PlanStatus;
} = {}): Promise<string | null> {
  const slugs = await listSlugs();
  if (slugs.length === 0) {
    console.error("No plans found. Run `pf new` to create one.");
    return null;
  }

  const metas = await Promise.all(slugs.map((s) => readMeta(s)));
  let filtered = metas;
  if (opts.statusFilter) {
    filtered = metas.filter((m) => m.status === opts.statusFilter);
  }

  if (filtered.length === 0) {
    console.error(`No plans with status: ${opts.statusFilter}`);
    return null;
  }

  const lines = filtered.map(formatPlanLine);

  const selected = await fzfSelect(lines, {
    prompt: opts.prompt ?? "plan> ",
    header: "Select a plan  (Esc to cancel)",
    // Preview: extract slug from line (4th token) and run pf show --brief
    preview: "pf show $(echo {} | awk '{print $3}') --brief 2>/dev/null",
  });

  if (!selected) return null;
  return extractSlugFromLine(selected);
}

// Resolve a slug: use provided one, or launch picker
export async function resolveSlug(
  slug: string | undefined,
  opts: { prompt?: string } = {}
): Promise<string | null> {
  if (slug) return slug;
  return pickPlan(opts);
}

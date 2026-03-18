import { listSlugs } from "../core/store.ts";
import { readMeta } from "../core/meta.ts";
import { formatPlanLine } from "./format.ts";
import type { PlanStatus } from "../types/index.ts";

// --- fzf: dumb picker, nothing else ---

export async function fzfPick(
  lines: string[],
  opts: { prompt?: string; header?: string; preview?: string } = {}
): Promise<string | null> {
  const args = ["fzf", "--ansi", "--no-sort"];
  if (opts.prompt) args.push("--prompt", opts.prompt);
  if (opts.header) args.push("--header", opts.header);
  if (opts.preview) {
    args.push("--preview", opts.preview, "--preview-window", "right:60%:wrap");
  }

  const proc = Bun.spawn(args, {
    stdin: "pipe",
    stdout: "pipe",
    stderr: "inherit",
  });

  proc.stdin.write(lines.join("\n"));
  proc.stdin.end();

  const exitCode = await proc.exited;
  if (exitCode !== 0) return null;

  const output = await new Response(proc.stdout).text();
  return output.trim() || null;
}

// --- Plan picker: fzf over plans, returns slug ---

function extractSlug(line: string): string | null {
  // Format: "icon status  slug  title [tags]"
  const parts = line.trim().split(/\s+/);
  return parts[2] ?? null;
}

export async function pickSlug(opts: {
  prompt?: string;
  statusFilter?: PlanStatus;
} = {}): Promise<string | null> {
  const slugs = await listSlugs();
  if (slugs.length === 0) {
    console.error("No plans found. Run `pf new` to create one.");
    return null;
  }

  const metas = await Promise.all(slugs.map((s) => readMeta(s).catch(() => null)));
  let filtered = metas.filter((m) => m !== null);
  if (opts.statusFilter) {
    filtered = filtered.filter((m) => m.status === opts.statusFilter);
  }
  if (filtered.length === 0) {
    console.error(opts.statusFilter ? `No plans with status: ${opts.statusFilter}` : "No plans found.");
    return null;
  }

  const lines = filtered.map(formatPlanLine);
  const selected = await fzfPick(lines, {
    prompt: opts.prompt ?? "plan> ",
    header: "Select a plan  (Esc to cancel)",
    preview: "pf show $(echo {} | awk '{print $3}') --brief 2>/dev/null",
  });

  if (!selected) return null;
  return extractSlug(selected);
}

// --- Resolve: use provided slug or launch picker ---

export async function resolveSlug(
  slug: string | undefined,
  opts: { prompt?: string } = {}
): Promise<string | null> {
  if (slug) return slug;
  return pickSlug(opts);
}

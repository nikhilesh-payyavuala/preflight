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
  if (exitCode !== 0) return null;

  const output = await new Response(proc.stdout).text();
  return output.trim() || null;
}

const STATUS_HEADER = "enter:open  ctrl-a:approve  ctrl-r:reject  ctrl-s:submit  ctrl-x:execute  ctrl-d:complete";

// Extract slug from fzf line: awk '{print $3}'
const SLUG_AWK = "echo {} | awk '{print $3}'";
// Reload command: regenerate the plan list in fzf-compatible format
const RELOAD_CMD = "pf search --fzf 2>/dev/null";

function statusBind(key: string, status: string): string {
  return `${key}:execute-silent(pf update $(${SLUG_AWK}) --status ${status})+reload(${RELOAD_CMD})`;
}

// Show an fzf picker over all plans. Status changes happen in-place via fzf --bind.
// Returns the slug selected with Enter, or null if cancelled.
export async function pickPlan(opts: {
  prompt?: string;
  statusFilter?: PlanStatus;
} = {}): Promise<string | null> {
  const slugs = await listSlugs();
  if (slugs.length === 0) {
    console.error("No plans found. Run `pf new` to create one.");
    return null;
  }

  const metas = await Promise.all(
    slugs.map((s) => readMeta(s).catch(() => null))
  );
  let filtered = metas.filter((m) => m !== null);
  if (opts.statusFilter) {
    filtered = filtered.filter((m) => m.status === opts.statusFilter);
  }

  if (filtered.length === 0) {
    console.error(opts.statusFilter ? `No plans with status: ${opts.statusFilter}` : "No plans found.");
    return null;
  }

  const lines = filtered.map(formatPlanLine);

  const args = [
    "fzf", "--ansi", "--no-sort",
    "--prompt", opts.prompt ?? "plan> ",
    "--header", STATUS_HEADER,
    "--preview", `pf show $(${SLUG_AWK}) --brief 2>/dev/null`,
    "--preview-window", "right:60%:wrap",
    "--bind", statusBind("ctrl-a", "approved"),
    "--bind", statusBind("ctrl-r", "rejected"),
    "--bind", statusBind("ctrl-s", "in-review"),
    "--bind", statusBind("ctrl-x", "executing"),
    "--bind", statusBind("ctrl-d", "completed"),
  ];

  const proc = Bun.spawn(args, {
    stdin: "pipe",
    stdout: "pipe",
    stderr: "inherit",
  });

  proc.stdin.write(lines.join("\n"));
  proc.stdin.end();

  const exitCode = await proc.exited;
  if (exitCode !== 0) return null;

  const output = (await new Response(proc.stdout).text()).trim();
  if (!output) return null;

  return extractSlugFromLine(output);
}

// Resolve a slug: use provided one, or launch picker
export async function resolveSlug(
  slug: string | undefined,
  opts: { prompt?: string } = {}
): Promise<string | null> {
  if (slug) return slug;
  return pickPlan(opts);
}

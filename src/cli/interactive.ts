import { listSlugs } from "../core/store.ts";
import { readMeta } from "../core/meta.ts";
import { formatPlanLineFzf } from "./format.ts";
import type { PlanStatus } from "../types/index.ts";

const STATUS_HEADER = "enter:open  ctrl-a:approve  ctrl-r:reject  ctrl-s:submit  ctrl-x:execute  ctrl-d:complete";

// Reload command: regenerate the plan list in fzf format
const RELOAD_CMD = "pf search --fzf 2>/dev/null";

function statusBind(key: string, status: string): string {
  // {1} is the slug (first tab-delimited field, hidden from display)
  return `${key}:execute-silent(pf update {1} --status ${status})+reload(${RELOAD_CMD})`;
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

// Show an fzf picker over all plans with inline status transitions.
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

  const lines = filtered.map(formatPlanLineFzf);

  const args = [
    "fzf", "--ansi", "--no-sort",
    "--delimiter", "\t",
    "--with-nth", "2..",           // Display: everything after the slug
    "--preview", "pf show {1} --brief 2>/dev/null",  // {1} = slug
    "--preview-window", "right:60%:wrap",
    "--prompt", opts.prompt ?? "plan> ",
    "--header", STATUS_HEADER,
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

  // Output is the full line: "slug\tdisplay...". Extract slug.
  return output.split("\t")[0] ?? null;
}

// Resolve a slug: use provided one, or launch picker
export async function resolveSlug(
  slug: string | undefined,
  opts: { prompt?: string } = {}
): Promise<string | null> {
  if (slug) return slug;
  return pickPlan(opts);
}

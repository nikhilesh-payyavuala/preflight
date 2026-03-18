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
// When expectKeys is set, returns { key, line } where key is the pressed key.
export async function fzfSelect(
  lines: string[],
  opts: { preview?: string; prompt?: string; header?: string; expectKeys?: string[] } = {}
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
  if (opts.expectKeys?.length) {
    args.push("--expect", opts.expectKeys.join(","));
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

// fzf with --expect returns "key\nselected_line". Parse both.
export function parseFzfExpect(output: string): { key: string; line: string } | null {
  if (!output) return null;
  const lines = output.split("\n");
  return { key: lines[0] ?? "", line: lines[1] ?? "" };
}

export const STATUS_KEYS = ["ctrl-a", "ctrl-r", "ctrl-s", "ctrl-x", "ctrl-d"] as const;
export const STATUS_KEY_MAP: Record<string, string> = {
  "ctrl-a": "approved",
  "ctrl-r": "rejected",
  "ctrl-s": "in-review",
  "ctrl-x": "executing",
  "ctrl-d": "completed",
};
const STATUS_HEADER = "enter:open  ctrl-a:approve  ctrl-r:reject  ctrl-s:submit  ctrl-x:execute  ctrl-d:complete";

// Show an fzf picker over all plans, return { slug, action }
export async function pickPlan(opts: {
  prompt?: string;
  statusFilter?: PlanStatus;
} = {}): Promise<{ slug: string; action: string } | null> {
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

  const selected = await fzfSelect(lines, {
    prompt: opts.prompt ?? "plan> ",
    header: STATUS_HEADER,
    preview: "pf show $(echo {} | awk '{print $3}') --brief 2>/dev/null",
    expectKeys: [...STATUS_KEYS],
  });

  if (!selected) return null;

  const parsed = parseFzfExpect(selected);
  if (!parsed) return null;

  const slug = extractSlugFromLine(parsed.line);
  if (!slug) return null;

  const action = parsed.key && STATUS_KEY_MAP[parsed.key]
    ? STATUS_KEY_MAP[parsed.key]
    : "show";

  return { slug, action };
}

// Resolve a slug: use provided one, or launch picker with status actions.
// Loops on status changes so the user stays in the picker.
export async function resolveSlug(
  slug: string | undefined,
  opts: { prompt?: string } = {}
): Promise<string | null> {
  if (slug) return slug;

  while (true) {
    const result = await pickPlan(opts);
    if (!result) return null;

    // Status transition — apply and re-launch picker
    if (result.action !== "show") {
      const { updateMeta } = await import("../core/meta.ts");
      await updateMeta(result.slug, { status: result.action as any });
      console.log(`${result.slug} → ${result.action}`);
      continue; // Loop back to picker with updated data
    }

    return result.slug;
  }
}

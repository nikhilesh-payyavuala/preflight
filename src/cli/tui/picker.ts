import { listSlugs } from "../../core/store.ts";
import { readMeta } from "../../core/meta.ts";
import { formatPlanLine } from "../format.ts";

// Extract slug from formatPlanLine output: "icon status  slug  title [tags]"
function extractSlug(line: string): string | null {
  const parts = line.trim().split(/\s+/);
  return parts[2] ?? null;
}

// Launch fzf over plan list, return selected slug or null (Esc).
export async function pickSlug(opts: { prompt?: string } = {}): Promise<string | null> {
  const slugs = await listSlugs();
  if (slugs.length === 0) {
    console.error("No plans found. Run `pf new` to create one.");
    return null;
  }

  const metas = await Promise.all(slugs.map((s) => readMeta(s).catch(() => null)));
  const filtered = metas.filter((m) => m !== null);
  if (filtered.length === 0) return null;

  const lines = filtered.map(formatPlanLine);

  const proc = Bun.spawn(
    [
      "fzf", "--ansi", "--no-sort",
      "--prompt", opts.prompt ?? "plan> ",
      "--header", "Select a plan  (Esc to cancel)",
      "--preview", "pf show $(echo {} | awk '{print $3}') --brief 2>/dev/null",
      "--preview-window", "right:60%:wrap",
    ],
    { stdin: "pipe", stdout: "pipe", stderr: "inherit" }
  );

  proc.stdin.write(lines.join("\n"));
  proc.stdin.end();

  const exitCode = await proc.exited;
  if (exitCode !== 0) return null;

  const output = (await new Response(proc.stdout).text()).trim();
  if (!output) return null;

  return extractSlug(output);
}

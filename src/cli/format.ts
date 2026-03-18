import type { PlanStatus, PlanMeta } from "../types/index.ts";

export const STATUS_ICON: Record<PlanStatus, string> = {
  draft: "○",
  "in-review": "◑",
  approved: "●",
  executing: "▶",
  completed: "✓",
  archived: "⌂",
  rejected: "✗",
};

export const STATUS_COLOR: Record<PlanStatus, string> = {
  draft: "\x1b[90m",
  "in-review": "\x1b[33m",
  approved: "\x1b[32m",
  executing: "\x1b[36m",
  completed: "\x1b[34m",
  archived: "\x1b[90m",
  rejected: "\x1b[31m",
};

export const RESET = "\x1b[0m";

// Display format: icon + status + slug + title + tags
export function formatPlanLine(meta: PlanMeta): string {
  const icon = STATUS_ICON[meta.status] ?? "?";
  const tags = meta.tags.length ? `  [${meta.tags.join(", ")}]` : "";
  return `${icon} ${meta.status.padEnd(10)}  ${meta.slug.padEnd(36)}  ${meta.title}${tags}`;
}

// fzf format: slug (hidden field 1) + display fields
// Use with --delimiter='\t' --with-nth=2.. so fzf shows the display part
// but {1} gives the slug for commands
export function formatPlanLineFzf(meta: PlanMeta): string {
  const icon = STATUS_ICON[meta.status] ?? "?";
  const tags = meta.tags.length ? `  [${meta.tags.join(", ")}]` : "";
  return `${meta.slug}\t${icon} ${meta.status.padEnd(10)}  ${meta.slug.padEnd(36)}  ${meta.title}${tags}`;
}

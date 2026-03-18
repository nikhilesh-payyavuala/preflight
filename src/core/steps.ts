import type { PlanStep } from "../types/index.ts";

// Extract step titles from plan.md content.
// Looks for ### Step N: headings under ## Implementation.
export function extractSteps(content: string): string[] {
  const lines = content.split("\n");
  let inImplementation = false;
  const titles: string[] = [];

  for (const line of lines) {
    if (line.match(/^## Implementation/i)) {
      inImplementation = true;
      continue;
    }
    // Stop at the next ## section after Implementation
    if (inImplementation && line.match(/^## /) && !line.match(/^### /)) {
      break;
    }
    if (inImplementation) {
      const match = line.match(/^### Step \d+[:.]\s*(.*)/i);
      if (match) {
        titles.push(match[1].trim() || `Step ${titles.length + 1}`);
      }
    }
  }

  return titles;
}

// Merge new titles with existing steps, preserving statuses.
// Steps matched by title keep their status. New steps are pending. Removed steps are dropped.
export function syncSteps(existing: PlanStep[], titles: string[]): PlanStep[] {
  const existingByTitle = new Map(existing.map((s) => [s.title, s.status]));

  return titles.map((title) => ({
    title,
    status: existingByTitle.get(title) ?? "pending",
  }));
}

import { select } from "@clack/prompts";
import { readMeta, updateMeta } from "../../core/meta.ts";
import { planPath } from "../../core/store.ts";
import type { PlanStatus } from "../../types/index.ts";

const STATUS_ACTIONS: Record<string, { value: string; label: string }[]> = {
  draft: [
    { value: "in-review", label: "Submit for review" },
    { value: "edit", label: "Edit in $EDITOR" },
    { value: "back", label: "Back to list" },
    { value: "done", label: "Done" },
  ],
  "in-review": [
    { value: "approved", label: "Approve" },
    { value: "rejected", label: "Reject" },
    { value: "edit", label: "Edit in $EDITOR" },
    { value: "back", label: "Back to list" },
    { value: "done", label: "Done" },
  ],
  approved: [
    { value: "executing", label: "Start executing" },
    { value: "edit", label: "Edit in $EDITOR" },
    { value: "back", label: "Back to list" },
    { value: "done", label: "Done" },
  ],
  executing: [
    { value: "completed", label: "Mark completed" },
    { value: "in-review", label: "Back to in-review" },
    { value: "edit", label: "Edit in $EDITOR" },
    { value: "back", label: "Back to list" },
    { value: "done", label: "Done" },
  ],
  completed: [
    { value: "archived", label: "Archive" },
    { value: "draft", label: "Reopen as draft" },
    { value: "back", label: "Back to list" },
    { value: "done", label: "Done" },
  ],
  rejected: [
    { value: "draft", label: "Reopen as draft" },
    { value: "archived", label: "Archive" },
    { value: "back", label: "Back to list" },
    { value: "done", label: "Done" },
  ],
  archived: [
    { value: "draft", label: "Reopen as draft" },
    { value: "back", label: "Back to list" },
    { value: "done", label: "Done" },
  ],
};

// Prompt for an action on a plan. Returns "back" or "done".
export async function promptAction(slug: string, status: string): Promise<"back" | "done"> {
  const options = STATUS_ACTIONS[status] ?? [
    { value: "back", label: "Back to list" },
    { value: "done", label: "Done" },
  ];

  const action = await select({ message: "Action:", options });
  if (typeof action !== "string") return "done";

  if (action === "back" || action === "done") return action;

  if (action === "edit") {
    const editor = process.env.EDITOR ?? process.env.VISUAL ?? "vi";
    await Bun.$`${editor} ${planPath(slug)}`;
    return "back";
  }

  // Status transition
  await updateMeta(slug, { status: action as PlanStatus });
  console.log(`${slug} → ${action}`);
  return "back";
}

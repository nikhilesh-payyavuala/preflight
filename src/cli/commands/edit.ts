import { planPath, planExists } from "../../core/store.ts";
import { resolveSlug } from "../interactive.ts";

export async function cmdEdit(slug: string | undefined): Promise<void> {
  const resolved = await resolveSlug(slug, { prompt: "edit> " });
  if (!resolved) process.exit(0);

  if (!planExists(resolved)) {
    console.error(`Plan not found: ${resolved}`);
    process.exit(1);
  }

  const editor = process.env.EDITOR ?? process.env.VISUAL ?? "vi";
  await Bun.$`${editor} ${planPath(resolved)}`;
}

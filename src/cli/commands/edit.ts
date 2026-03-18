import { planPath, planExists } from "../../core/store.ts";

export async function cmdEdit(slug: string | undefined): Promise<void> {
  if (!slug) {
    console.error("Missing required argument: <slug>");
    console.error("Usage: pf edit <slug>");
    process.exit(1);
  }
  if (!planExists(slug)) {
    console.error(`Plan not found: ${slug}`);
    process.exit(1);
  }

  const editor = process.env.EDITOR ?? process.env.VISUAL ?? "vi";
  await Bun.$`${editor} ${planPath(slug)}`;
}

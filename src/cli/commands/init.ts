import { ensureStore, CONFIG_PATH, PREFLIGHT_DIR } from "../../core/store.ts";
import { existsSync } from "fs";
import { initDb } from "../../core/db.ts";

const DEFAULT_CONFIG = `# Preflight configuration
editor: $EDITOR
default_author: agent
`;

export async function cmdInit(): Promise<void> {
  await ensureStore();

  if (!existsSync(CONFIG_PATH)) {
    await Bun.write(CONFIG_PATH, DEFAULT_CONFIG);
  }

  initDb();

  console.log(`Preflight initialized at ${PREFLIGHT_DIR}`);
}

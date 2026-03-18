import { existsSync } from "fs";
import { PREFLIGHT_DIR } from "../../core/store.ts";
import { initDb, rebuildIndex } from "../../core/db.ts";
import { handleListPlans, handleGetPlan, handleSearch } from "../../web/api.ts";
import index from "../../web/index.html";

export async function cmdServe(opts: { port: number }) {
  if (!existsSync(PREFLIGHT_DIR)) {
    console.error("Preflight not initialized. Run `pf init` first.");
    process.exit(1);
  }

  // Initialize search index
  try {
    initDb();
    await rebuildIndex();
  } catch {
    console.warn("Warning: Could not initialize search index. Search may not work.");
  }

  const port = opts.port;

  try {
    Bun.serve({
      port,
      routes: {
        "/": index,
        "/api/plans": {
          GET: handleListPlans,
        },
        "/api/search": {
          GET: handleSearch,
        },
      },
      fetch(req) {
        const url = new URL(req.url);
        // Handle /api/plans/:slug
        if (url.pathname.startsWith("/api/plans/") && req.method === "GET") {
          return handleGetPlan(req);
        }
        return new Response("Not found", { status: 404 });
      },
      development: {
        hmr: true,
        console: true,
      },
    });
  } catch (err: any) {
    if (err?.code === "EADDRINUSE") {
      console.error(`Port ${port} is already in use. Try: pf serve --port ${port + 1}`);
      process.exit(1);
    }
    throw err;
  }

  const url = `http://localhost:${port}`;
  console.log(`\n  Preflight dashboard running at ${url}\n`);

  // Open browser on macOS
  try {
    await Bun.$`open ${url}`.quiet();
  } catch {
    // Not macOS or open not available
  }
}

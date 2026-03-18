import { test, expect, beforeAll, afterAll } from "bun:test";
import { mkdtemp, rm, mkdir } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";

let tmpDir: string;

beforeAll(async () => {
  tmpDir = await mkdtemp(join(tmpdir(), "pf-test-db-"));
  process.env.PREFLIGHT_HOME = tmpDir;

  // Create store and a test plan
  const store = await import("../../src/core/store.ts");
  const meta = await import("../../src/core/meta.ts");
  await store.ensureStore();
  await mkdir(store.planDir("db-test-plan"), { recursive: true });

  const m = meta.newMeta("db-test-plan", "Database Test Plan", "claude", ["/repo"], ["search", "test"]);
  await meta.writeMeta(m);
  await Bun.write(store.planPath("db-test-plan"), "## Context\n\nThis plan tests the search index with OAuth migration keywords.\n\n## Implementation\n\nDo the thing.");
});

afterAll(async () => {
  await rm(tmpDir, { recursive: true, force: true });
  delete process.env.PREFLIGHT_HOME;
});

test("initDb creates database and tables", async () => {
  const db = await import("../../src/core/db.ts");
  db.initDb();

  const { existsSync } = await import("fs");
  const store = await import("../../src/core/store.ts");
  expect(existsSync(store.DB_PATH)).toBe(true);
});

test("indexPlan inserts into FTS and meta tables", async () => {
  const db = await import("../../src/core/db.ts");
  db.initDb();
  await db.indexPlan("db-test-plan");

  const database = db.getDb();
  const ftsRow = database.query("SELECT slug, title FROM plans_fts WHERE slug = ?").get("db-test-plan") as any;
  expect(ftsRow).not.toBeNull();
  expect(ftsRow.title).toBe("Database Test Plan");

  const metaRow = database.query("SELECT slug, status FROM plans_meta WHERE slug = ?").get("db-test-plan") as any;
  expect(metaRow).not.toBeNull();
  expect(metaRow.status).toBe("draft");
});

test("searchPlans finds indexed plans by keyword", async () => {
  const db = await import("../../src/core/db.ts");
  const results = db.searchPlans("OAuth migration");
  expect(results.length).toBeGreaterThan(0);
  expect(results[0].slug).toBe("db-test-plan");
});

test("searchPlans returns empty for non-matching query", async () => {
  const db = await import("../../src/core/db.ts");
  const results = db.searchPlans("xyznonexistent123");
  expect(results.length).toBe(0);
});

test("removePlanFromIndex removes from both tables", async () => {
  const db = await import("../../src/core/db.ts");

  // First index it
  await db.indexPlan("db-test-plan");
  let results = db.searchPlans("OAuth");
  expect(results.length).toBeGreaterThan(0);

  // Remove it
  db.removePlanFromIndex("db-test-plan");
  results = db.searchPlans("OAuth");
  expect(results.length).toBe(0);
});

test("rebuildIndex re-indexes all plans", async () => {
  const db = await import("../../src/core/db.ts");

  // Remove first, then rebuild
  db.removePlanFromIndex("db-test-plan");
  let results = db.searchPlans("OAuth");
  expect(results.length).toBe(0);

  await db.rebuildIndex();
  results = db.searchPlans("OAuth");
  expect(results.length).toBeGreaterThan(0);
});

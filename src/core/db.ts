import { Database } from "bun:sqlite";
import { DB_PATH, PLANS_DIR, listSlugs } from "./store.ts";
import { readMeta } from "./meta.ts";
import { join } from "path";

let _db: Database | null = null;

export function getDb(): Database {
  if (!_db) _db = new Database(DB_PATH);
  return _db;
}

export function initDb(): void {
  const db = getDb();
  db.run(`
    CREATE VIRTUAL TABLE IF NOT EXISTS plans_fts USING fts5(
      slug,
      title,
      tags,
      content,
      tokenize = 'porter unicode61'
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS plans_meta (
      slug TEXT PRIMARY KEY,
      status TEXT,
      author TEXT,
      created TEXT,
      updated TEXT,
      repos TEXT,
      tags TEXT
    )
  `);
}

function indexPlanWithDb(db: Database, slug: string, meta: { title: string; tags: string[]; status: string; author: string; created: string; updated: string; repos: string[] }, content: string): void {
  db.run(`DELETE FROM plans_fts WHERE slug = ?`, [slug]);
  db.run(
    `INSERT INTO plans_fts (slug, title, tags, content) VALUES (?, ?, ?, ?)`,
    [slug, meta.title, meta.tags.join(" "), content]
  );
  db.run(
    `INSERT OR REPLACE INTO plans_meta (slug, status, author, created, updated, repos, tags)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      slug,
      meta.status,
      meta.author,
      meta.created,
      meta.updated,
      JSON.stringify(meta.repos),
      JSON.stringify(meta.tags),
    ]
  );
}

export async function indexPlan(slug: string): Promise<void> {
  const db = getDb();
  const meta = await readMeta(slug);
  const planFile = Bun.file(join(PLANS_DIR, slug, "plan.md"));
  const content = (await planFile.exists()) ? await planFile.text() : "";
  indexPlanWithDb(db, slug, meta, content);
}

export async function rebuildIndex(): Promise<void> {
  const db = getDb();
  initDb();
  const slugs = await listSlugs();
  db.run("BEGIN");
  try {
    db.run("DELETE FROM plans_fts");
    db.run("DELETE FROM plans_meta");
    for (const slug of slugs) {
      const meta = await readMeta(slug);
      const planFile = Bun.file(join(PLANS_DIR, slug, "plan.md"));
      const content = (await planFile.exists()) ? await planFile.text() : "";
      indexPlanWithDb(db, slug, meta, content);
    }
    db.run("COMMIT");
  } catch (e) {
    db.run("ROLLBACK");
    throw e;
  }
}

export function removePlanFromIndex(slug: string): void {
  const db = getDb();
  db.run("DELETE FROM plans_fts WHERE slug = ?", [slug]);
  db.run("DELETE FROM plans_meta WHERE slug = ?", [slug]);
}

export interface SearchResult {
  slug: string;
  title: string;
  rank: number;
}

export function searchPlans(query: string, limit = 20): SearchResult[] {
  const db = getDb();
  const rows = db
    .query<{ slug: string; title: string; rank: number }, [string, number]>(
      `SELECT slug, title, rank
       FROM plans_fts
       WHERE plans_fts MATCH ?
       ORDER BY rank
       LIMIT ?`
    )
    .all(query, limit);
  return rows;
}

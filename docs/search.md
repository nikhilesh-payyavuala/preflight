# Search Design

## Current State

Search uses SQLite FTS5 (BM25) via `bun:sqlite`. The index lives at `~/.preflight/index.db` and contains two tables:

```sql
-- Full-text search across plan content
CREATE VIRTUAL TABLE plans_fts USING fts5(
  slug, title, tags, content,
  tokenize = 'porter unicode61'
);

-- Structured metadata for filtering
CREATE TABLE plans_meta (
  slug TEXT PRIMARY KEY,
  status TEXT,
  author TEXT,
  created TEXT,
  updated TEXT,
  repos TEXT,   -- JSON array: '["path1","path2"]'
  tags TEXT     -- JSON array: '["auth","migration"]'
);
```

`pf search <query>` runs FTS5 MATCH against `plans_fts`. `pf search` with no query lists all plans with optional `--status`, `--repo`, `--tag` filters.

## Known Gap: Unified Filtering

`pf search "oauth" --status approved --repo .` should run one query:

```sql
SELECT f.slug, f.title, rank
FROM plans_fts f
JOIN plans_meta m ON f.slug = m.slug
WHERE plans_fts MATCH 'oauth'
  AND m.status = 'approved'
  AND m.repos LIKE '%/path/to/repo%'
ORDER BY rank
LIMIT 20
```

Currently the FTS search path doesn't support filters — they only work in the list-all mode. Fix planned for v0.2.

## Why Not QMD?

[QMD](https://github.com/tobi/qmd) (BM25 + vector + LLM reranking) was evaluated as an integration. Rejected because:

1. **No metadata filtering.** QMD can only filter by collection name, not by document fields.

2. **`bun:sqlite` can't load extensions.** Vector search requires `sqlite-vec`, which is a SQLite extension. Bun's bundled SQLite is compiled without `loadExtension` support.

3. **Ownership.** We own the schema, so we can add `status`, `repo`, and `tags` as proper SQL columns.

## Roadmap

### v0.2 — Fix unified filtering
Wire `--status`, `--repo`, `--tag` flags into `searchPlans()` as SQL JOIN filters.

### v0.3 — Optional embedding search
For users who configure an API key (`embedding_api_key` in `config.yml`):
- On `pf new` / `pf update`, generate an embedding via the configured API
- Store as BLOB in a new `plans_embeddings` table
- At search time, compute cosine similarity in JS
- Merge with BM25 results using RRF (Reciprocal Rank Fusion)

### Not planned
- `sqlite-vec` (blocked by Bun)
- `node-llama-cpp` local models (too heavy for a CLI tool)
- QMD as a subprocess (loses metadata filtering)

# Interactive View + Web Dashboard Design

## Overview

Add two new commands to the Preflight CLI:

- **`pf view`** — Ink-based TUI with split-pane layout for browsing and reading plans in the terminal
- **`pf serve`** — Bun.serve() web dashboard for searching and viewing plans in a browser

Both are read-only interfaces that reuse the existing `src/core/` modules (store, meta, db). No new data formats or storage changes.

## `pf view` — Terminal UI

### Technology

- **Ink 5.x** (React for CLI) for rendering — requires **React 18.x**
- **marked** for markdown parsing
- **chalk** for ANSI styling of parsed markdown (headers, code blocks, checkboxes, inline code)

### Layout

Split pane:
- **Left pane (35%):** Plan list with fuzzy filter input at top. Each item shows slug, title, and status badge (colored by status).
- **Right pane (65%):** Rendered markdown content of the selected plan, with metadata strip at top (status, tags, author, updated date).

### Keybindings

| Key | Action |
|-----|--------|
| `↑` / `↓` | Navigate plan list |
| `Enter` | Select plan (load into right pane) |
| `/` | Focus fuzzy filter input |
| `Esc` | Clear filter / unfocus |
| `j` / `k` | Scroll content pane |
| `PgUp` / `PgDn` | Page scroll content |
| `q` | Quit |

### Markdown Rendering

Parse markdown with `marked` and render to styled terminal output:
- **`## Headings`** — bold, colored (e.g. section headers in a distinct color)
- **`- [ ]` / `- [x]`** — checkbox rendering with colored check/empty indicators
- **`` `inline code` ``** — background-highlighted
- **Code blocks** — indented with dimmed border, dimmed text (no syntax highlighting in v1)
- **Lists** — proper indentation with bullet characters
- **Bold/italic** — ANSI bold/italic

### Data Flow

1. On launch: `listSlugs()` from store.ts → `readMeta()` for each → populate list with metadata cached
2. On select: use cached metadata for the strip + `Bun.file(planPath(slug)).text()` → parse with `marked` → render to terminal
3. On filter: simple substring match against slug + title (no external fuzzy library)

### CLI Registration

Export `cmdView` from `src/cli/commands/view.ts`, following existing pattern (`cmdSearch`, `cmdList`, etc.).

```
pf view [slug]
```
- No args: launch TUI with plan list
- With slug: launch TUI with that plan pre-selected

## `pf serve` — Web Dashboard

### Technology

- **Bun.serve()** with HTML imports (per CLAUDE.md guidelines)
- **React** frontend bundled by Bun
- **marked** for client-side markdown rendering
- No external CSS framework — custom CSS matching the design system

### Server Architecture

```typescript
Bun.serve({
  routes: {
    "/": index.html,        // SPA entry point
    "/api/plans": GET,      // list all plans with metadata
    "/api/plans/:slug": GET, // single plan with content
    "/api/search": GET,      // FTS search (?q=query&limit=20)
  },
  development: { hmr: true, console: true }
})
```

### API Routes

**`GET /api/plans`**
Returns `{ plans: PlanMeta[] }`. Supports query params:
- `?status=draft` — filter by status (exact match)
- `?tag=cli` — filter by tag (plans where `tags` array includes the value)
- `?repo=/path` — filter by repo (plans where `repos` array includes the value)

**`GET /api/plans/:slug`**
Returns `{ meta: PlanMeta, content: string }` (raw markdown content).

**`GET /api/search?q=query`**
Returns `{ results: { slug, title, rank }[] }`. Uses existing `searchPlans()` from db.ts.

### Frontend

Single-page React app with client-side routing (hash-based: `#/` for list, `#/plans/<slug>` for detail — no router library needed, just `window.location.hash` state).

**Layout:**
- **Sidebar (240px fixed):**
  - Logo: SVG checkmark + "preflight" in JetBrains Mono
  - Search input with `/` keyboard shortcut hint
  - Status filter pills (All, Draft, In-Review, Approved, Executing, Completed, Rejected, Archived)
  - Scrollable plan list — each item shows title, slug (mono), status badge
- **Main content area:**
  - Top bar: breadcrumb (slug / title), date, status badge
  - Metadata strip: tags, repos, author as inline pills. PRs shown as links if present. `depends-on` shown as linked slugs if present.
  - Rendered markdown content

### Design System

**Fonts:**
- `JetBrains Mono` — slugs, code, metadata values, tags, status badges, verification commands
- `IBM Plex Sans` — headings, body text, UI labels
- Google Fonts import: `https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600&family=JetBrains+Mono:wght@400;500;600&display=swap`

**Color Palette (dark-only):**

| Token | Hex | Usage |
|-------|-----|-------|
| bg | `#0C0C0C` | Page background |
| sidebar | `#111111` | Sidebar background |
| surface | `#1A1A1A` | Cards, inputs, code blocks |
| border | `#1E1E1E` | All borders |
| border-hover | `#252525` | Hover/active borders |
| text-primary | `#E0E0E0` | Headings, selected items |
| text-secondary | `#999999` | Body text |
| text-muted | `#555555` | Metadata labels, inactive items |
| text-dim | `#333333` | Slugs in inactive items |
| green | `#22C55E` | Completed, success, active accents |
| amber | `#E5A50A` | In-review, warning |
| blue | `#3B82F6` | Approved, info |
| red | `#EF4444` | Rejected status, error states |

**Status badge pattern:** Text color at full opacity, background at 15% opacity (e.g., `color: #22C55E; background: #22C55E15`).

**Icons:** Lucide React (SVG). No emojis anywhere.

**Anti-patterns to avoid:**
- No purple gradients or glow effects
- No glassmorphism or blur
- No rounded-full pill navigation
- No emoji icons
- No "AI-looking" aesthetics

### Markdown Rendering (Client-Side)

Use `marked` to parse plan.md content. Custom renderer:
- `## Headings` — IBM Plex Sans, 16px, `#E0E0E0`, bottom border `#1E1E1E`
- `- [ ]` checkboxes — SVG checkbox icons, green when checked, strikethrough text
- Code blocks — `#111` background, `#1E1E1E` border, JetBrains Mono
- Inline code — `#1A1A1A` background, `#C0C0C0` text, JetBrains Mono
- Verification section commands — rendered as terminal prompt lines with green `$` prefix

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `/` | Focus search |
| `Esc` | Clear search |
| `↑` / `↓` | Navigate plan list |
| `Enter` | Select plan |

### CLI Registration

Export `cmdServe` from `src/cli/commands/serve.ts`, following existing pattern.

```
pf serve [--port 3456]
```
- Default port: 3456
- Opens browser automatically on launch (via `Bun.$\`open <url>\`` on macOS)
- Prints URL to terminal

## Error Handling

- **No `~/.preflight/` directory:** Both commands check for the store directory on launch. If missing, print "Run `pf init` first" and exit with code 1.
- **Missing/malformed plan files:** Skip plans with missing `meta.yml` or `plan.md` — show them as greyed out in the list with a warning indicator. Don't crash.
- **FTS index not built:** `pf serve` search route calls `initDb()` on startup, creating the index if needed. If indexing fails, search returns empty results with a message.
- **Port already in use:** `pf serve` catches `EADDRINUSE`, prints a message suggesting `--port`, and exits.

## File Structure

```
src/
  cli/
    commands/
      view.ts           — TUI entry point (Ink render)
      serve.ts          — Bun.serve() setup + API routes
  web/
    index.html          — SPA entry point (HTML import)
    app.tsx             — React app root
    components/
      Sidebar.tsx       — Search, filters, plan list
      PlanView.tsx      — Metadata + rendered markdown
    styles.css          — Full design system CSS
    lib/
      api.ts            — fetch wrappers for /api/*
      markdown.ts       — marked config + custom renderer
  tui/
    App.tsx             — Ink root component
    components/
      PlanList.tsx      — Left pane: filterable list
      PlanContent.tsx   — Right pane: rendered markdown
      StatusBadge.tsx   — Colored status text
    lib/
      markdown.ts       — Terminal markdown renderer
```

## New Dependencies

| Package | Purpose |
|---------|---------|
| `ink@^5` | React renderer for terminal |
| `ink-text-input` | Filter input in TUI |
| `react@^18` + `react-dom@^18` | Frontend (web + Ink) |
| `marked` | Markdown parsing (both TUI and web) |
| `chalk` | ANSI color output in TUI |
| `lucide-react` | SVG icons for web UI |

## Out of Scope

- Editing plans from the web UI
- Changing plan status from the web UI
- Authentication / multi-user
- Light mode
- WebSocket live updates

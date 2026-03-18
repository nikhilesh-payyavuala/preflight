import { listSlugs, planPath } from "../core/store.ts";
import { readMeta } from "../core/meta.ts";
import { searchPlans } from "../core/db.ts";
import type { PlanMeta } from "../types/index.ts";

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function handleListPlans(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const filterStatus = url.searchParams.get("status");
  const filterTag = url.searchParams.get("tag");
  const filterRepo = url.searchParams.get("repo");

  const slugs = await listSlugs();
  const plans: PlanMeta[] = [];

  for (const slug of slugs) {
    try {
      const meta = await readMeta(slug);

      if (filterStatus && meta.status !== filterStatus) continue;
      if (filterTag && !meta.tags.includes(filterTag)) continue;
      if (filterRepo && !meta.repos.includes(filterRepo)) continue;

      plans.push(meta);
    } catch {
      // skip malformed plans
    }
  }

  return json({ plans });
}

export async function handleGetPlan(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const slug = url.pathname.replace("/api/plans/", "");

  if (!slug) {
    return json({ error: "Missing slug" }, 400);
  }

  try {
    const meta = await readMeta(slug);
    const file = Bun.file(planPath(slug));
    const content = (await file.exists()) ? await file.text() : "";
    return json({ meta, content });
  } catch {
    return json({ error: `Plan not found: ${slug}` }, 404);
  }
}

export async function handleSearch(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const query = url.searchParams.get("q");
  const limit = parseInt(url.searchParams.get("limit") ?? "20");

  if (!query) {
    return json({ results: [] });
  }

  try {
    const results = searchPlans(query, limit);
    return json({ results });
  } catch {
    return json({ results: [], error: "Search index not available" });
  }
}

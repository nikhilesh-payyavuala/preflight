import type { PlanMeta } from "../../types/index.ts";

export interface PlanDetail {
  meta: PlanMeta;
  content: string;
}

export interface SearchResult {
  slug: string;
  title: string;
  rank: number;
}

export async function fetchPlans(filters?: {
  status?: string;
  tag?: string;
  repo?: string;
}): Promise<PlanMeta[]> {
  const params = new URLSearchParams();
  if (filters?.status) params.set("status", filters.status);
  if (filters?.tag) params.set("tag", filters.tag);
  if (filters?.repo) params.set("repo", filters.repo);

  const qs = params.toString();
  const res = await fetch(`/api/plans${qs ? `?${qs}` : ""}`);
  const data = await res.json();
  return data.plans;
}

export async function fetchPlan(slug: string): Promise<PlanDetail> {
  const res = await fetch(`/api/plans/${encodeURIComponent(slug)}`);
  if (!res.ok) throw new Error(`Plan not found: ${slug}`);
  return res.json();
}

export async function searchPlansApi(query: string): Promise<SearchResult[]> {
  const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
  const data = await res.json();
  return data.results;
}

export type PlanStatus =
  | "draft"
  | "in-review"
  | "approved"
  | "executing"
  | "completed"
  | "archived"
  | "rejected";

export interface PlanPR {
  repo: string;
  number: number;
}

export interface PlanMeta {
  slug: string;
  title: string;
  status: PlanStatus;
  created: string;
  updated: string;
  author: string;
  owner: string;
  repos: string[];
  tags: string[];
  prs: PlanPR[];
  parent: string | null;
  children: string[];
  "depends-on": string[];
}

export interface Plan {
  meta: PlanMeta;
  content: string;
}

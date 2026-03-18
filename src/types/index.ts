export type PlanStatus =
  | "draft"
  | "in-review"
  | "approved"
  | "executing"
  | "completed"
  | "archived"
  | "rejected";

export type StepStatus = "pending" | "in-progress" | "completed";

export interface PlanStep {
  title: string;
  status: StepStatus;
}

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
  steps: PlanStep[];
  "depends-on": string[];
}

export interface Plan {
  meta: PlanMeta;
  content: string;
}

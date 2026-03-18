import { test, expect } from "bun:test";
import { extractSteps, syncSteps } from "../../src/core/steps.ts";
import type { PlanStep } from "../../src/types/index.ts";

test("extractSteps finds steps under ## Implementation", () => {
  const content = `## Context

Some context.

## Goals

- [ ] Goal

## Implementation

### Step 1: Do the first thing

Details...

### Step 2: Do the second thing

More details...

### Step 3: Final step

Done.
`;
  const steps = extractSteps(content);
  expect(steps).toEqual(["Do the first thing", "Do the second thing", "Final step"]);
});

test("extractSteps ignores headings before ## Implementation", () => {
  const content = `## Context

### Step 1: Not a real step

## Implementation

### Step 1: Real step
`;
  expect(extractSteps(content)).toEqual(["Real step"]);
});

test("extractSteps returns empty for no Implementation section", () => {
  const content = `## Context\n\nJust context.`;
  expect(extractSteps(content)).toEqual([]);
});

test("extractSteps returns empty for Implementation with no steps", () => {
  const content = `## Implementation\n\nSome text but no step headings.`;
  expect(extractSteps(content)).toEqual([]);
});

test("extractSteps handles Step N. (dot) and Step N: (colon)", () => {
  const content = `## Implementation\n\n### Step 1. With a dot\n\n### Step 2: With a colon`;
  expect(extractSteps(content)).toEqual(["With a dot", "With a colon"]);
});

test("syncSteps preserves status for matching titles", () => {
  const existing: PlanStep[] = [
    { title: "First", status: "completed" },
    { title: "Second", status: "in-progress" },
  ];
  const titles = ["First", "Second", "Third"];
  const result = syncSteps(existing, titles);

  expect(result).toEqual([
    { title: "First", status: "completed" },
    { title: "Second", status: "in-progress" },
    { title: "Third", status: "pending" },
  ]);
});

test("syncSteps drops removed steps", () => {
  const existing: PlanStep[] = [
    { title: "Keep", status: "completed" },
    { title: "Remove", status: "pending" },
  ];
  const titles = ["Keep"];
  const result = syncSteps(existing, titles);

  expect(result).toEqual([{ title: "Keep", status: "completed" }]);
});

test("syncSteps handles empty existing", () => {
  const result = syncSteps([], ["New step"]);
  expect(result).toEqual([{ title: "New step", status: "pending" }]);
});

test("syncSteps handles empty titles", () => {
  const result = syncSteps([{ title: "Old", status: "completed" }], []);
  expect(result).toEqual([]);
});

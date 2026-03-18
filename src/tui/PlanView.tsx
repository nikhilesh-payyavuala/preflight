import React from "react";
import { Box, Text } from "ink";
import { marked } from "marked";
import TerminalRenderer from "marked-terminal";
import type { PlanMeta } from "../types/index.ts";

const STATUS_COLOR: Record<string, string> = {
  draft: "gray",
  "in-review": "yellow",
  approved: "green",
  executing: "cyan",
  completed: "blue",
  archived: "gray",
  rejected: "red",
};

const STEP_ICON = { pending: "○", "in-progress": "▶", completed: "✓" } as const;

function renderMd(content: string): string {
  marked.setOptions({ renderer: new TerminalRenderer() });
  return (marked.parse(content) as string).trim();
}

export function PlanView({ meta, content, brief }: { meta: PlanMeta; content: string; brief?: boolean }) {
  let body = content;
  if (brief) {
    const lines = content.split("\n");
    const implIdx = lines.findIndex((l) => l.match(/^## Implementation/i));
    if (implIdx !== -1) {
      body = lines.slice(0, implIdx).join("\n").trimEnd();
    }
  }

  const color = STATUS_COLOR[meta.status] ?? "white";
  const steps = meta.steps ?? [];
  const done = steps.filter((s) => s.status === "completed").length;
  const rendered = renderMd(body);

  return (
    <Box flexDirection="column">
      <Box flexDirection="column" marginBottom={1}>
        <Text bold>{meta.title}  <Text dimColor>({meta.slug})</Text></Text>
        <Text>
          Status: <Text color={color}>{meta.status}</Text>
          {"  |  "}Author: {meta.author}
          {meta.owner ? `  |  Owner: ${meta.owner}` : ""}
          {"  |  "}Updated: {meta.updated.slice(0, 10)}
        </Text>
        {steps.length > 0 && <Text>Steps: {done}/{steps.length}</Text>}
        {meta.parent ? <Text>Parent: {meta.parent}</Text> : null}
        {meta.repos.length > 0 && <Text>Repos: {meta.repos.join(", ")}</Text>}
        {meta.tags.length > 0 && <Text>Tags: {meta.tags.join(", ")}</Text>}
      </Box>
      {steps.length > 0 && (
        <Box flexDirection="column" marginBottom={1}>
          {steps.map((s, i) => {
            const icon = STEP_ICON[s.status];
            const c = s.status === "completed" ? "green" : s.status === "in-progress" ? "cyan" : "gray";
            return <Text key={i} color={c}>  {icon} {i + 1}. {s.title}</Text>;
          })}
        </Box>
      )}
      <Text>{rendered}</Text>
    </Box>
  );
}

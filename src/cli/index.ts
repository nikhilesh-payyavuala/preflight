#!/usr/bin/env bun
import { Command } from "commander";
import { cmdInit } from "./commands/init.ts";
import { cmdNew } from "./commands/new.ts";
import { cmdShow } from "./commands/show.ts";
import { cmdEdit } from "./commands/edit.ts";
import { cmdUpdate } from "./commands/update.ts";
import { cmdSearch } from "./commands/search.ts";
import { cmdDelete } from "./commands/delete.ts";
import { cmdInstallSkills } from "./commands/install-skills.ts";

const program = new Command()
  .name("pf")
  .description("Preflight — manage AI coding plans as first-class artifacts")
  .version("0.1.0");

program
  .command("init")
  .description("Initialize Preflight (~/.preflight/)")
  .action(cmdInit);

program
  .command("new [slug]")
  .description("Scaffold a new plan (interactive if slug/title omitted)")
  .option("-t, --title <title>", "Plan title")
  .option("-r, --repo <path>", "Associated repo path")
  .option("--tags <tags>", "Comma-separated tags")
  .option("--author <name>", "Author name (default: agent)")
  .option("--owner <name>", "Human owner responsible for this plan")
  .option("--parent <slug>", "Parent plan slug (creates a child plan)")
  .action(cmdNew);

program
  .command("search [query]")
  .description("Search plans (no query = list all)")
  .option("-n, --limit <n>", "Max results", "20")
  .option("-s, --status <status>", "Filter by status")
  .option("-r, --repo <path>", "Filter by repo (. = current repo)")
  .option("--tag <tag>", "Filter by tag")
  .option("--owner <name>", "Filter by owner")
  .option("--plain", "Plain list output, no interactive picker")
  .option("--json", "Output JSON")
  .action((query, opts) =>
    cmdSearch(query, { ...opts, limit: parseInt(opts.limit) })
  );

program
  .command("show [slug]")
  .description("Show a plan (TUI if no slug given)")
  .option("-b, --brief", "Show only Context, Goals, and Reviews")
  .option("-m, --meta", "Show metadata only")
  .option("--json", "Output JSON")
  .action(cmdShow);

program
  .command("edit [slug]")
  .description("Open plan in $EDITOR (fzf picker if slug omitted)")
  .action(cmdEdit);

program
  .command("update [slug]")
  .description("Update plan metadata, add reviews, or link PRs")
  .option("-s, --status <status>", "New status")
  .option("--title <title>", "New title")
  .option("--add-repo <path>", "Add a repo association")
  .option("--remove-repo <path>", "Remove a repo association")
  .option("--add-tag <tag>", "Add a tag")
  .option("--remove-tag <tag>", "Remove a tag")
  .option("--owner <name>", "Set the human owner")
  .option("--add-pr <number>", "Link a PR number")
  .option("--review <text>", "Append a review")
  .option("--by <name>", "Reviewer name (with --review)")
  .action(cmdUpdate);

program
  .command("delete [slug]")
  .description("Delete a plan (fzf picker if slug omitted)")
  .option("-f, --force", "Skip confirmation")
  .action(cmdDelete);

program
  .command("install-skills")
  .description("Install Preflight skills into all detected IDEs and agents")
  .option("--agent <name>", "Install to a specific agent only (claude, cursor, codex, gemini...)")
  .option("--all", "Install to all agents without prompts")
  .option("--fallback", "Skip skills CLI, use manual symlinks only")
  .action(cmdInstallSkills);

program.parse();

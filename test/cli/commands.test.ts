import { test, expect, beforeAll, afterAll } from "bun:test";
import { mkdtemp, rm } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { existsSync } from "fs";

let tmpDir: string;
const CLI = join(import.meta.dir, "..", "..", "src", "cli", "index.ts");

beforeAll(async () => {
  tmpDir = await mkdtemp(join(tmpdir(), "pf-test-cli-"));
});

afterAll(async () => {
  await rm(tmpDir, { recursive: true, force: true });
});

async function pf(...args: string[]): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  const proc = Bun.spawn(["bun", CLI, ...args], {
    env: { ...process.env, PREFLIGHT_HOME: tmpDir },
    stdout: "pipe",
    stderr: "pipe",
  });
  const exitCode = await proc.exited;
  const stdout = await new Response(proc.stdout).text();
  const stderr = await new Response(proc.stderr).text();
  return { stdout, stderr, exitCode };
}

test("pf --version", async () => {
  const { stdout, exitCode } = await pf("--version");
  expect(exitCode).toBe(0);
  expect(stdout.trim()).toBe("0.1.0");
});

test("pf init", async () => {
  const { exitCode } = await pf("init");
  expect(exitCode).toBe(0);
  expect(existsSync(join(tmpDir, ".preflight", "plans"))).toBe(true);
});

test("pf new creates a plan", async () => {
  const { stdout, exitCode } = await pf("new", "test-smoke", "--title", "Smoke Test");
  expect(exitCode).toBe(0);
  expect(stdout).toContain("test-smoke");
  expect(existsSync(join(tmpDir, ".preflight", "plans", "test-smoke", "plan.md"))).toBe(true);
  expect(existsSync(join(tmpDir, ".preflight", "plans", "test-smoke", "meta.yml"))).toBe(true);
});

test("pf new rejects invalid slug", async () => {
  const { exitCode, stderr } = await pf("new", "INVALID_SLUG", "--title", "Bad");
  expect(exitCode).not.toBe(0);
});

test("pf new rejects duplicate slug", async () => {
  const { exitCode } = await pf("new", "test-smoke", "--title", "Dupe");
  expect(exitCode).not.toBe(0);
});

test("pf search --plain lists plans", async () => {
  const { stdout, exitCode } = await pf("search", "--plain");
  expect(exitCode).toBe(0);
  expect(stdout).toContain("test-smoke");
  expect(stdout).toContain("Smoke Test");
});

test("pf show prints plan", async () => {
  const { stdout, exitCode } = await pf("show", "test-smoke");
  expect(exitCode).toBe(0);
  expect(stdout).toContain("Smoke Test");
  expect(stdout).toContain("## Context");
});

test("pf show --brief stops before Implementation", async () => {
  const { stdout, exitCode } = await pf("show", "test-smoke", "--brief");
  expect(exitCode).toBe(0);
  expect(stdout).toContain("## Context");
  expect(stdout).not.toContain("## Implementation");
});

test("pf show --meta prints metadata", async () => {
  const { stdout, exitCode } = await pf("show", "test-smoke", "--meta");
  expect(exitCode).toBe(0);
  expect(stdout).toContain("draft");
  expect(stdout).toContain("test-smoke");
});

test("pf show --json returns valid JSON", async () => {
  const { stdout, exitCode } = await pf("show", "test-smoke", "--json");
  expect(exitCode).toBe(0);
  const data = JSON.parse(stdout);
  expect(data.meta.slug).toBe("test-smoke");
  expect(data.content).toContain("## Context");
});

test("pf update --status changes status", async () => {
  const { exitCode } = await pf("update", "test-smoke", "--status", "approved");
  expect(exitCode).toBe(0);

  const { stdout } = await pf("show", "test-smoke", "--meta");
  expect(stdout).toContain("approved");
});

test("pf update --review appends review", async () => {
  const { exitCode } = await pf("update", "test-smoke", "--review", "Looks good", "--by", "tester");
  expect(exitCode).toBe(0);

  const { stdout } = await pf("show", "test-smoke");
  expect(stdout).toContain("tester");
  expect(stdout).toContain("Looks good");
});

test("pf update --owner sets owner", async () => {
  const { exitCode } = await pf("update", "test-smoke", "--owner", "alice");
  expect(exitCode).toBe(0);

  const { stdout } = await pf("show", "test-smoke", "--meta");
  expect(stdout).toContain("alice");
});

test("pf search with query finds plan", async () => {
  const { stdout, exitCode } = await pf("search", "smoke", "--plain");
  expect(exitCode).toBe(0);
  expect(stdout).toContain("test-smoke");
});

test("pf new --parent creates child and wires hierarchy", async () => {
  const { exitCode, stdout } = await pf("new", "child-smoke", "--title", "Child Plan", "--parent", "test-smoke");
  expect(exitCode).toBe(0);
  expect(stdout).toContain("child of test-smoke");

  // Parent should list child
  const { stdout: parentMeta } = await pf("show", "test-smoke", "--meta");
  expect(parentMeta).toContain("child-smoke");

  // Child should reference parent
  const { stdout: childMeta } = await pf("show", "child-smoke", "--meta");
  expect(childMeta).toContain("parent:  test-smoke");
});

test("pf new --parent rejects nonexistent parent", async () => {
  const { exitCode } = await pf("new", "orphan", "--title", "Orphan", "--parent", "nonexistent");
  expect(exitCode).not.toBe(0);
});

test("pf search --owner filters by owner", async () => {
  const r1 = await pf("new", "owner-test", "--title", "Owner Test", "--owner", "diana");
  if (r1.exitCode !== 0) console.log("NEW FAILED:", r1.stderr);

  const r2 = await pf("search", "--owner", "diana", "--plain");
  if (r2.exitCode !== 0) console.log("SEARCH FAILED:", r2.stderr.slice(0, 500));

  expect(r2.exitCode).toBe(0);
  expect(r2.stdout).toContain("owner-test");

  await pf("delete", "owner-test", "-f");
});

test("pf delete removes plan", async () => {
  const { exitCode } = await pf("delete", "child-smoke", "-f");
  expect(exitCode).toBe(0);
  expect(existsSync(join(tmpDir, ".preflight", "plans", "child-smoke"))).toBe(false);
});

test("pf delete removes main test plan", async () => {
  const { exitCode } = await pf("delete", "test-smoke", "-f");
  expect(exitCode).toBe(0);
  expect(existsSync(join(tmpDir, ".preflight", "plans", "test-smoke"))).toBe(false);
});

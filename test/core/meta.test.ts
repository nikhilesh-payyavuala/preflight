import { test, expect, beforeAll, afterAll } from "bun:test";
import { mkdtemp, rm } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";

let tmpDir: string;

beforeAll(async () => {
  tmpDir = await mkdtemp(join(tmpdir(), "pf-test-meta-"));
  process.env.PREFLIGHT_HOME = tmpDir;
});

afterAll(async () => {
  await rm(tmpDir, { recursive: true, force: true });
  delete process.env.PREFLIGHT_HOME;
});

// Dynamic imports so PREFLIGHT_HOME is set before module resolution
async function getModules() {
  // Force fresh module resolution
  const store = await import("../../src/core/store.ts");
  const meta = await import("../../src/core/meta.ts");
  return { store, meta };
}

test("newMeta returns correct defaults", async () => {
  const { meta } = await getModules();
  const m = meta.newMeta("test-slug", "Test Title");
  expect(m.slug).toBe("test-slug");
  expect(m.title).toBe("Test Title");
  expect(m.status).toBe("draft");
  expect(m.author).toBe("agent");
  expect(m.owner).toBe("");
  expect(m.repos).toEqual([]);
  expect(m.tags).toEqual([]);
  expect(m.prs).toEqual([]);
  expect(m.parent).toBeNull();
  expect(m.children).toEqual([]);
  expect(m["depends-on"]).toEqual([]);
});

test("newMeta accepts owner and parent", async () => {
  const { meta } = await getModules();
  const m = meta.newMeta("child-slug", "Child", "claude", [], [], {
    owner: "alice",
    parent: "parent-slug",
  });
  expect(m.owner).toBe("alice");
  expect(m.parent).toBe("parent-slug");
});

test("writeMeta then readMeta round-trips", async () => {
  const { store, meta } = await getModules();
  await store.ensureStore();

  const { mkdir } = await import("fs/promises");
  await mkdir(store.planDir("roundtrip"), { recursive: true });

  const original = meta.newMeta("roundtrip", "Round Trip Test", "claude", ["/repo"], ["tag1"]);
  await meta.writeMeta(original);

  const read = await meta.readMeta("roundtrip");
  expect(read.slug).toBe("roundtrip");
  expect(read.title).toBe("Round Trip Test");
  expect(read.status).toBe("draft");
  expect(read.author).toBe("claude");
  expect(read.repos).toEqual(["/repo"]);
  expect(read.tags).toEqual(["tag1"]);
});

test("updateMeta patches fields and updates timestamp", async () => {
  const { store, meta } = await getModules();
  await store.ensureStore();
  const { mkdir } = await import("fs/promises");
  await mkdir(store.planDir("update-test"), { recursive: true });

  const original = meta.newMeta("update-test", "Before");
  original.updated = "2020-01-01T00:00:00.000Z"; // Force old timestamp
  await meta.writeMeta(original);

  const updated = await meta.updateMeta("update-test", { title: "After", status: "approved" });
  expect(updated.title).toBe("After");
  expect(updated.status).toBe("approved");
  expect(updated.updated).not.toBe("2020-01-01T00:00:00.000Z");
});

test("addChild and removeChild wire parent-child", async () => {
  const { store, meta } = await getModules();
  await store.ensureStore();
  const { mkdir } = await import("fs/promises");
  await mkdir(store.planDir("parent-test"), { recursive: true });
  await mkdir(store.planDir("child-test"), { recursive: true });

  await meta.writeMeta(meta.newMeta("parent-test", "Parent"));
  await meta.writeMeta(meta.newMeta("child-test", "Child"));

  await meta.addChild("parent-test", "child-test");
  const parent = await meta.readMeta("parent-test");
  expect(parent.children).toContain("child-test");

  // Adding same child again should not duplicate
  await meta.addChild("parent-test", "child-test");
  const parent2 = await meta.readMeta("parent-test");
  expect(parent2.children.filter((c) => c === "child-test").length).toBe(1);

  await meta.removeChild("parent-test", "child-test");
  const parent3 = await meta.readMeta("parent-test");
  expect(parent3.children).not.toContain("child-test");
});

test("readMeta throws for nonexistent slug", async () => {
  const { meta } = await getModules();
  expect(meta.readMeta("nonexistent-slug-xyz")).rejects.toThrow();
});

export async function currentRepo(): Promise<string | null> {
  try {
    const r = await Bun.$`git rev-parse --show-toplevel`.quiet();
    return r.stdout.toString().trim() || null;
  } catch {
    return null;
  }
}

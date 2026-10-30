import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { runCli } from "../cli-run.js";

/** Writes a config module exporting a stand-in backend, so the CLI's own logic is what runs. */
function config(source: string): { dir: string; file: string } {
  const dir = mkdtempSync(join(tmpdir(), "cy-backend-cli-"));
  writeFileSync(join(dir, "backend.mjs"), source);
  return { dir, file: "backend.mjs" };
}

async function run(args: string[], cwd = process.cwd()) {
  const out: string[] = [];
  const err: string[] = [];
  const code = await runCli(args, { out: (l) => out.push(l), err: (l) => err.push(l), cwd });
  return { code, out: out.join("\n"), err: err.join("\n") };
}

const pending = `export default {
  migrate: async ({ dryRun }) => dryRun ? { applied: [], pending: ["0001_a", "0002_b"] } : { applied: ["0001_a", "0002_b"], pending: [] },
  prune: async () => 3,
};`;

describe("runCli", () => {
  it("plans by default and lists what would run", async () => {
    const { dir, file } = config(pending);
    const result = await run(["migrate", "--config", file], dir);
    expect(result.code).toBe(0);
    expect(result.out).toBe(
      "2 migrations to apply:\n  0001_a\n  0002_b\nBack up the database, then run again with --apply.",
    );
  });

  it("applies with --apply", async () => {
    const { dir, file } = config(pending);
    expect((await run(["migrate", "--apply", "--config", file], dir)).out).toBe(
      "Applied 2 migrations: 0001_a, 0002_b.",
    );
  });

  it("says when there is nothing to do", async () => {
    const { dir, file } = config(
      "export const backend = { migrate: async () => ({ applied: [], pending: [] }), prune: async () => 1 };",
    );
    expect((await run(["migrate", "--config", file], dir)).out).toBe(
      "The database schema is up to date. Nothing to apply.",
    );
    expect((await run(["migrate", "--apply", "--config", file], dir)).out).toBe(
      "The database schema is already up to date.",
    );
    expect((await run(["prune", "--config", file], dir)).out).toBe("Removed 1 record.");
  });

  it("prunes and reports the count", async () => {
    const { dir, file } = config(pending);
    expect(await run(["prune", "--config", file], dir)).toEqual({
      code: 0,
      out: "Removed 3 records.",
      err: "",
    });
  });

  it("explains a config that exports no backend", async () => {
    const { dir, file } = config("export default { hello: true };");
    const result = await run(["migrate", "--config", file], dir);
    expect(result.code).toBe(1);
    expect(result.err).toContain("must export the result of createConsentBackend()");
  });

  it("reports a failing migration and exits 1", async () => {
    const { dir, file } = config(
      "export default { migrate: async () => { throw new Error('permission denied'); }, prune: async () => 0 };",
    );
    expect(await run(["migrate", "--apply", "--config", file], dir)).toMatchObject({
      code: 1,
      err: "cookieyes-backend: permission denied",
    });
  });

  it("prints usage for help, and fails for a missing command or config", async () => {
    expect((await run(["--help"])).code).toBe(0);
    expect((await run([])).code).toBe(1);
    const noConfig = await run(["migrate"]);
    expect(noConfig.code).toBe(1);
    expect(noConfig.err).toContain("Usage: cookieyes-backend");
  });
});

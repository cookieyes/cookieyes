// @vitest-environment node
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import * as source from "../styles.js";

const pkgDir = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const svelteDist = join(pkgDir, "..", "svelte", "dist");

describe("styles constants (source)", () => {
  it("are the sentinels the build replaces", () => {
    expect(source.CRITICAL_CSS).toBe("__CY_CRITICAL_CSS__");
    expect(source.CRITICAL_CSS_HASH).toBe("__CY_CRITICAL_CSS_HASH__");
    expect(source._STYLES_CSS).toBe("__CY_STYLES_CSS__");
    expect(source._STYLES_CSS_VERSION).toBe("__CY_STYLES_CSS_VERSION__");
  });
});

/**
 * Source tests see the build-time sentinels, so the inlined values are checked against `dist/`:
 * the critical CSS must be `@cookieyes/svelte/critical.css` byte for byte, or the published CSP
 * hash would not admit it.
 */
describe("built values (dist)", () => {
  const dist = join(pkgDir, "dist", "styles.js");
  const skip = !existsSync(dist) || !existsSync(join(svelteDist, "critical.css"));

  it.skipIf(skip)("inlines @cookieyes/svelte's critical.css and publishes its sha256", async () => {
    const built = (await import(dist)) as typeof import("../styles.js");
    const critical = readFileSync(join(svelteDist, "critical.css"), "utf8");
    expect(built.CRITICAL_CSS).toBe(critical);
    const hash = createHash("sha256").update(critical, "utf8").digest("base64");
    expect(built.CRITICAL_CSS_HASH).toBe(`'sha256-${hash}'`);
  });

  it.skipIf(skip)("serves @cookieyes/svelte's styles.css", async () => {
    const built = (await import(dist)) as typeof import("../styles.js");
    expect(built._STYLES_CSS).toBe(readFileSync(join(svelteDist, "styles.css"), "utf8"));
  });

  it.skipIf(skip)("replaces every sentinel, and the version is a short URL-safe hash", async () => {
    const text = readFileSync(dist, "utf8");
    expect(text).not.toContain("__CY_");
    const built = (await import(dist)) as typeof import("../styles.js");
    expect(built._STYLES_CSS_VERSION).toMatch(/^[A-Za-z0-9]{12}$/);
  });

  it.skipIf(skip)(
    "ships the stylesheets beside the entry, byte equal to @cookieyes/svelte's",
    () => {
      for (const name of ["styles.css", "critical.css"]) {
        expect(readFileSync(join(pkgDir, "dist", name), "utf8")).toBe(
          readFileSync(join(svelteDist, name), "utf8"),
        );
      }
    },
  );

  const nextDist = join(pkgDir, "..", "nextjs", "dist", "server.js");

  it.skipIf(skip || !existsSync(nextDist))(
    "publishes the same CSP hash as @cookieyes/nextjs, so one policy line admits both",
    async () => {
      const built = (await import(dist)) as typeof import("../styles.js");
      const next = (await import(nextDist)) as { CRITICAL_CSS_HASH: string };
      expect(built.CRITICAL_CSS_HASH).toBe(next.CRITICAL_CSS_HASH);
    },
  );
});

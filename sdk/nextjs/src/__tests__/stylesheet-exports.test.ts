/// <reference types="node" />
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * The stylesheet a `@cookieyes/nextjs` consumer imports.
 *
 * The README, the quick-start and the CLI all used to emit
 * `import "@cookieyes/react/styles.css"`. That resolves under npm and Yarn
 * Classic, which hoist `@cookieyes/react` to the app's `node_modules` root, and
 * **fails under pnpm**, which does not — the package is in the virtual store,
 * reachable from `@cookieyes/nextjs` but not from the app. A pnpm consumer
 * following our own documentation got MODULE_NOT_FOUND, and the benchmark apps
 * (which use pnpm) simply dropped the import, which is why the published
 * leaderboard measured an unstyled banner.
 *
 * `scripts/emit-css-proxies.mjs` now emits a one-line `@import` per sheet into
 * this package's own `dist/`, so `@cookieyes/nextjs/styles.css` resolves
 * everywhere. These tests pin the three things that have to stay in step for
 * that to keep working.
 */
const pkgDir = process.cwd();
const pkg = JSON.parse(readFileSync(join(pkgDir, "package.json"), "utf8"));
const reactPkg = JSON.parse(readFileSync(join(pkgDir, "..", "react", "package.json"), "utf8"));

/** Every `*.css` subpath `@cookieyes/react` exports. */
const REACT_SHEETS = Object.keys(reactPkg.exports).filter((k) => k.endsWith(".css"));

describe("@cookieyes/nextjs stylesheet exports", () => {
  it("exports every stylesheet @cookieyes/react does", () => {
    // Drift guard: a new sheet added to react must be re-exported here, or
    // pnpm consumers silently cannot reach it.
    expect(REACT_SHEETS.length).toBeGreaterThan(0);
    for (const subpath of REACT_SHEETS) {
      expect(Object.keys(pkg.exports)).toContain(subpath);
      expect(pkg.exports[subpath]).toBe(`./dist${subpath.slice(1)}`);
    }
  });

  it("does not claim to be free of side effects, because it ships CSS", () => {
    // A blanket `sideEffects: false` entitles a bundler to drop a
    // side-effect-only CSS import, which unstyles the banner with no error.
    expect(pkg.sideEffects).not.toBe(false);
    expect(pkg.sideEffects).toContain("**/*.css");
  });

  it("generates the proxies as part of the build", () => {
    expect(pkg.scripts.build).toContain("emit-css-proxies.mjs");
  });

  it("emits every sheet as a verbatim copy of @cookieyes/react's", () => {
    const dist = join(pkgDir, "dist");
    if (!existsSync(dist)) {
      // `pnpm test` can run before `pnpm build` locally. The assertions above
      // cover the contract; this one needs artefacts.
      return;
    }
    for (const subpath of REACT_SHEETS) {
      const name = subpath.slice(2);
      const file = join(dist, name);
      expect(existsSync(file), `${name} missing from dist/`).toBe(true);

      // Real bytes, not an `@import`. Consumers inline `critical.css` into a
      // <style> block and copy `styles.css` into their static directory; both
      // are filesystem reads, and an `@import` would resolve against the
      // document URL and 404.
      const mine = readFileSync(file);
      expect(mine.toString("utf8").trimStart().startsWith("@import")).toBe(false);

      // Byte-identical, because consumers pin the inlined sheet with a CSP
      // hash — one stray byte and the browser rejects their style block.
      expect(mine.equals(readFileSync(join(pkgDir, "..", "react", "dist", name)))).toBe(true);
    }
  });
});

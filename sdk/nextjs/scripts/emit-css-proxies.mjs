#!/usr/bin/env node
/**
 * Emit `dist/styles.css` and `dist/critical.css` for `@cookieyes/nextjs`.
 *
 * Each is a one-line `@import` of the real sheet in `@cookieyes/react`. They
 * exist because the documented import did not work for a large share of our
 * consumers:
 *
 *   import "@cookieyes/react/styles.css";   // README, quick-start, CLI output
 *
 * Under npm and Yarn Classic, `@cookieyes/react` is hoisted to the app's
 * `node_modules` root and that resolves. Under pnpm's strict layout it is not —
 * it lives in the virtual store, reachable from `@cookieyes/nextjs` but not
 * from the app — so the import fails with MODULE_NOT_FOUND and the visitor gets
 * an unstyled banner. Same tarballs, same package.json, different package
 * manager, different answer. This is the same resolution rule that already
 * forced `registerNetworkBlocker` to be re-exported from `@cookieyes/react`
 * (see the comment in `sdk/react/src/index.ts`), applied to a stylesheet.
 *
 * An `exports` map cannot point into a dependency, so the fix has to be a real
 * file in this package. A one-line `@import` is preferred over copying the CSS:
 * the specifier is resolved from *inside* `node_modules/@cookieyes/nextjs`,
 * where the sibling is always reachable, and there is exactly one copy of the
 * stylesheet on disk and one source of truth for its contents.
 */
import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const dist = join(dirname(fileURLToPath(import.meta.url)), "..", "dist");

/**
 * Both sheets are copied verbatim rather than re-exported with an `@import`.
 *
 * An `@import` is enough for a bundler, but not for the two things consumers
 * actually need to do with these files:
 *
 *  - `critical.css` is *inlined* into a `<style>` block. An `@import` there
 *    resolves against the document URL and 404s.
 *  - `styles.css` is often copied into the app's own static directory so it
 *    can be loaded without blocking first paint. That copy is a filesystem
 *    read, which needs real bytes.
 *
 * Both are read via `require.resolve("@cookieyes/nextjs/<sheet>")`, which is
 * the only specifier a pnpm consumer who installed just this package can
 * resolve. Costing ~18 KB in the tarball to make that work is the right trade:
 * a browser still only ever downloads one copy.
 *
 * Generated from `@cookieyes/react`'s built output at build time, so the two
 * cannot drift, and byte-identical to it — consumers pin the inlined sheet
 * with a CSP hash, and one stray byte would break their policy.
 */
const SHEETS = ["styles.css", "critical.css"];

// Resolved through the exports map, the only path guaranteed to exist —
// `@cookieyes/react` does not export `./package.json`.
const require_ = createRequire(import.meta.url);

mkdirSync(dist, { recursive: true });

for (const name of SHEETS) {
  const src = require_.resolve(`@cookieyes/react/${name}`);
  if (!existsSync(src)) {
    throw new Error(
      `emit-css-proxies: ${src} missing — build @cookieyes/react before @cookieyes/nextjs.`,
    );
  }
  copyFileSync(src, join(dist, name));
}

console.log(`emit-css-proxies: copied ${SHEETS.join(", ")} from @cookieyes/react`);

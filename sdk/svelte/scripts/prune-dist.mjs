/**
 * Removes what must not be published from `dist` after `svelte-package` has run. It copies
 * everything under its input directory, so `src/__tests__` and `*.test.*` files would reach the
 * tarball, which the package gate rejects. It also writes a declaration map beside every
 * declaration, pointing at a `src` that is not published (the package ships `dist` only, so each
 * component exists once), and a map to a missing source fails the gate. Runs before
 * `copy-styles.mjs`, so Turbo caches a clean `dist`.
 */
import { readdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const DIST = join(dirname(fileURLToPath(import.meta.url)), "..", "dist");

function prune(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "__tests__") rmSync(path, { recursive: true });
      else prune(path);
    } else if (/\.test\./.test(entry.name) || entry.name.endsWith(".d.ts.map")) {
      rmSync(path);
    }
  }
}

prune(DIST);

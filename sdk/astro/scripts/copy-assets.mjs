/**
 * Ships `@cookieyes/vanilla`'s built stylesheets as this package's own `styles.css` and
 * `critical.css`, so `@cookieyes/astro/styles.css` resolves under pnpm's strict layout, and copies
 * the `.astro` components into `dist/components`, which the site's Astro compiles, with their
 * hand-written declarations. Turbo builds `vanilla` first.
 */
import { copyFileSync, readdirSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const DIST = join(root, "dist");

for (const name of ["styles.css", "critical.css"]) {
  copyFileSync(require.resolve(`@cookieyes/vanilla/${name}`), join(DIST, name));
}
copyFileSync(
  join(root, "src", "components", "components.d.ts"),
  join(DIST, "components", "index.d.ts"),
);
for (const name of readdirSync(join(root, "src", "components"))) {
  if (name.endsWith(".astro")) {
    copyFileSync(join(root, "src", "components", name), join(DIST, "components", name));
  }
}

/**
 * Ships `@cookieyes/vue`'s built stylesheets as this package's own `styles.css` and
 * `critical.css`, so `@cookieyes/nuxt/styles.css` resolves under pnpm's strict layout, where an
 * app that installed only this package cannot see `@cookieyes/vue`. Turbo builds `vue` first.
 */
import { copyFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const DIST = join(dirname(fileURLToPath(import.meta.url)), "..", "dist");

for (const name of ["styles.css", "critical.css"]) {
  copyFileSync(require.resolve(`@cookieyes/vue/${name}`), join(DIST, name));
}

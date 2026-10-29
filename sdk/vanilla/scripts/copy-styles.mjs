/**
 * Ships `@cookieyes/ui`'s built stylesheets as this package's own
 * `styles.css` and `critical.css`.
 *
 * Copied rather than re-exported through `exports`, so the published paths
 * `@cookieyes/vanilla/styles.css` and `@cookieyes/vanilla/critical.css` keep
 * resolving under pnpm's strict layout, where an app that installed only this
 * package cannot see `@cookieyes/ui`. The bytes are `ui`'s, so every framework
 * ships the same sheet. Turbo builds `ui` before this package.
 */
import { copyFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const DIST = join(dirname(fileURLToPath(import.meta.url)), "..", "dist");

for (const name of ["styles.css", "critical.css"]) {
  copyFileSync(require.resolve(`@cookieyes/ui/${name}`), join(DIST, name));
}

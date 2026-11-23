/**
 * Replaces the sentinels in `dist/styles.js` with `@cookieyes/svelte`'s built stylesheets, the
 * bytes a consumer ships, as `@cookieyes/nuxt` and `@cookieyes/nextjs` do from a Rollup plugin.
 * `svelte-package` has no transform hook, so this rewrites the one file after packaging. The CSP
 * hash must be over exactly the inlined bytes. Fails when a sentinel is missing, so a renamed
 * constant cannot ship unreplaced. Turbo builds `svelte` before this package, so the files exist.
 */
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const FILE = join(dirname(fileURLToPath(import.meta.url)), "..", "dist", "styles.js");

const critical = readFileSync(require.resolve("@cookieyes/svelte/critical.css"), "utf8");
const styles = readFileSync(require.resolve("@cookieyes/svelte/styles.css"), "utf8");
const sha256 = (s) => createHash("sha256").update(s, "utf8").digest("base64");

const replacements = {
  '"__CY_CRITICAL_CSS__"': JSON.stringify(critical),
  '"__CY_CRITICAL_CSS_HASH__"': JSON.stringify(`'sha256-${sha256(critical)}'`),
  '"__CY_STYLES_CSS__"': JSON.stringify(styles),
  '"__CY_STYLES_CSS_VERSION__"': JSON.stringify(sha256(styles).replace(/[+/=]/g, "").slice(0, 12)),
};

let out = readFileSync(FILE, "utf8");
for (const [sentinel, value] of Object.entries(replacements)) {
  if (!out.includes(sentinel))
    throw new Error(`inject-css: sentinel ${sentinel} missing from ${FILE}`);
  out = out.replaceAll(sentinel, () => value);
}
writeFileSync(FILE, out);

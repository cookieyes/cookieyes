import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { createLibConfig } from "../../rollup.shared.mjs";

const require = createRequire(import.meta.url);
const pkg = require("./package.json");

/**
 * Replace the sentinels in `src/styles.tsx` with the real stylesheets from
 * `@cookieyes/react`'s **built** output — the minified bytes a consumer
 * actually ships, not the source. Same approach as `injectPkgVersion` in the
 * shared config, for the same reason: the values must be baked in at build
 * time, and a Server Component cannot import a `.css` file.
 *
 * Reading `dist/` rather than `src/styles/*.css` is deliberate. The critical
 * sheet is inlined and pinned by a CSP hash; the hash must be over the exact
 * bytes emitted, and those are what `@cookieyes/react`'s own minifier produces.
 * Turbo builds react before nextjs, so the files exist.
 */
function injectCss() {
  const critical = readFileSync(require.resolve("@cookieyes/react/critical.css"), "utf8");
  const styles = readFileSync(require.resolve("@cookieyes/react/styles.css"), "utf8");
  const sha256 = (s) => createHash("sha256").update(s, "utf8").digest("base64");

  const replacements = {
    '"__CY_CRITICAL_CSS__"': JSON.stringify(critical),
    // CSP source-expression form, quoted, so it can be pasted straight into a
    // `style-src` directive.
    '"__CY_CRITICAL_CSS_HASH__"': JSON.stringify(`'sha256-${sha256(critical)}'`),
    '"__CY_STYLES_CSS__"': JSON.stringify(styles),
    // URL-safe, short: only has to change when the bytes change.
    '"__CY_STYLES_CSS_VERSION__"': JSON.stringify(
      sha256(styles).replace(/[+/=]/g, "").slice(0, 12),
    ),
  };

  return {
    name: "inject-css",
    transform(code, id) {
      if (!id.endsWith("/src/styles.tsx")) return null;
      let out = code;
      for (const [sentinel, value] of Object.entries(replacements)) {
        if (!out.includes(sentinel)) {
          throw new Error(`inject-css: sentinel ${sentinel} missing from ${id}`);
        }
        out = out.replaceAll(sentinel, value);
      }
      return { code: out, map: { mappings: "" } };
    },
  };
}

// Three entries. `index` is a client module ("use client"). `server` and
// `styles-route` read request state or are Route Handlers, so they must stay
// server-only and are excluded from the directive.
export default createLibConfig({
  pkg,
  entries: {
    index: "src/index.ts",
    server: "src/server.ts",
    "styles-route": "src/styles-route.ts",
  },
  useClient: true,
  useClientExclude: ["server", "styles-route"],
  extraPlugins: [injectCss()],
});

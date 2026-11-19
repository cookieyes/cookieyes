import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { createLibConfig } from "../../rollup.shared.mjs";

const require = createRequire(import.meta.url);
const pkg = require("./package.json");

/**
 * Replaces the sentinels in `src/styles.ts` with `@cookieyes/vue`'s built stylesheets, the bytes
 * a consumer ships, as `@cookieyes/nextjs` does from `@cookieyes/react`'s. The CSP hash must be
 * over exactly the inlined bytes. Turbo builds vue before this package, so the files exist.
 */
function injectCss() {
  const critical = readFileSync(require.resolve("@cookieyes/vue/critical.css"), "utf8");
  const styles = readFileSync(require.resolve("@cookieyes/vue/styles.css"), "utf8");
  const sha256 = (s) => createHash("sha256").update(s, "utf8").digest("base64");

  const replacements = {
    '"__CY_CRITICAL_CSS__"': JSON.stringify(critical),
    '"__CY_CRITICAL_CSS_HASH__"': JSON.stringify(`'sha256-${sha256(critical)}'`),
    '"__CY_STYLES_CSS__"': JSON.stringify(styles),
    '"__CY_STYLES_CSS_VERSION__"': JSON.stringify(
      sha256(styles).replace(/[+/=]/g, "").slice(0, 12),
    ),
  };

  return {
    name: "inject-css",
    transform(code, id) {
      if (!id.endsWith("/src/styles.ts")) return null;
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

/** Nuxt's and Nitro's virtual modules ("#imports") exist only inside the app's build. */
function externalVirtualModules() {
  return {
    name: "external-virtual-modules",
    resolveId(source) {
      return source.startsWith("#") ? { id: source, external: true } : null;
    },
  };
}

// ESM only: Nuxt loads modules as ESM, and the module finds its runtime files through
// `import.meta.url`, which a CommonJS build does not have. Each runtime file is its own entry
// because the module registers them by path rather than importing them.
export default createLibConfig({
  pkg,
  formats: ["esm"],
  preserveModules: true,
  entries: {
    index: "src/index.ts",
    "runtime/plugin": "src/runtime/plugin.ts",
    "runtime/network-blocker": "src/runtime/network-blocker.ts",
    "runtime/vue": "src/runtime/vue.ts",
    "runtime/components/CookieYesRoot": "src/runtime/components/CookieYesRoot.ts",
    "runtime/server/styles": "src/runtime/server/styles.ts",
    "runtime/server/head": "src/runtime/server/head.ts",
  },
  extraPlugins: [externalVirtualModules(), injectCss()],
});

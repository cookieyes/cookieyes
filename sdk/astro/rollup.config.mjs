import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { nodeResolve } from "@rollup/plugin-node-resolve";
import terser from "@rollup/plugin-terser";
import { rollup } from "rollup";
import esbuild from "rollup-plugin-esbuild";
import { createLibConfig } from "../../rollup.shared.mjs";

const require = createRequire(import.meta.url);
const pkg = require("./package.json");

/** Replaces each sentinel in `id`'s code, failing when one is missing so none ships unreplaced. */
function replaceSentinels(code, id, replacements, plugin) {
  let out = code;
  for (const [sentinel, value] of Object.entries(replacements)) {
    if (!out.includes(sentinel))
      throw new Error(`${plugin}: sentinel ${sentinel} missing from ${id}`);
    out = out.replaceAll(sentinel, () => value);
  }
  return { code: out, map: { mappings: "" } };
}

/**
 * Replaces the sentinels in `src/styles.ts` with `@cookieyes/vanilla`'s built stylesheets, the
 * bytes the banner ships with, as `@cookieyes/nuxt` does from `@cookieyes/vue`'s. The CSP hash
 * must be over exactly the inlined bytes. Turbo builds vanilla before this package.
 */
function injectCss() {
  const critical = readFileSync(require.resolve("@cookieyes/vanilla/critical.css"), "utf8");
  const styles = readFileSync(require.resolve("@cookieyes/vanilla/styles.css"), "utf8");
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
      return replaceSentinels(code, id, replacements, "inject-css");
    },
  };
}

/**
 * Bundles `src/prepaint/script.ts`, with core's own cookie parser, into one minified IIFE and
 * puts its text in place of the sentinel in `src/prepaint/index.ts`. The parser is core's code,
 * not a copy, so the head script cannot read a cookie differently from the runtime. Its two
 * placeholders must survive minification, because `_prepaintScript` fills them per site build.
 */
function prepaint() {
  return {
    name: "prepaint",
    async transform(code, id) {
      if (!id.endsWith("/src/prepaint/index.ts")) return null;
      const bundle = await rollup({
        input: fileURLToPath(new URL("./src/prepaint/script.ts", import.meta.url)),
        plugins: [
          {
            name: "ts-js-resolve",
            resolveId: (source, importer) =>
              importer?.endsWith(".ts") && source.startsWith(".")
                ? fileURLToPath(new URL(source.replace(/\.js$/, ".ts"), `file://${importer}`))
                : null,
          },
          nodeResolve(),
          esbuild({ target: "es2017" }),
          terser({ format: { comments: false } }),
        ],
      });
      const { output } = await bundle.generate({ format: "iife" });
      await bundle.close();
      const script = output[0].code.trim().replace(/;$/, "");
      for (const placeholder of ["__CY_TAX__", "__CY_DEFAULT__"]) {
        if (script.split(placeholder).length !== 2) {
          throw new Error(
            `prepaint: ${placeholder} must appear exactly once in the bundled script`,
          );
        }
      }
      return replaceSentinels(
        code,
        id,
        { '"__CY_PREPAINT__"': JSON.stringify(script) },
        "prepaint",
      );
    },
  };
}

/** The middleware's virtual module exists only inside an Astro build, and `.astro` files are copied as they are. */
function externals() {
  return {
    name: "astro-externals",
    resolveId: (source) =>
      source.startsWith("virtual:") || source.endsWith(".astro")
        ? { id: source, external: true }
        : null,
  };
}

// ESM only: Astro loads integrations with `import`, and the integration finds its middleware, route
// and client files through `import.meta.url`, which a CommonJS build does not have. Each of those
// is an entry because the integration registers it by path rather than importing it. `markup` is an
// entry so its exports survive tree-shaking: only the copied `.astro` files import them.
const [js, types] = createLibConfig({
  pkg,
  formats: ["esm"],
  preserveModules: true,
  entries: {
    index: "src/index.ts",
    server: "src/server.ts",
    middleware: "src/middleware.ts",
    "styles-route": "src/styles-route.ts",
    "client/index": "src/client/index.ts",
    "client/network-blocker": "src/client/network-blocker.ts",
    "components/index": "src/components/index.ts",
    markup: "src/markup.ts",
  },
  extraPlugins: [externals(), injectCss(), prepaint()],
});
// The components entry re-exports `.astro` files, which the declaration build cannot follow; its
// declarations are written by hand (`src/components/components.d.ts`) and copied into place.
const { "components/index": _components, ...typed } = types.input;
types.input = typed;

export default [js, types];

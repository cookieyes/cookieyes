import { builtinModules } from "node:module";
import commonjs from "@rollup/plugin-commonjs";
import { nodeResolve } from "@rollup/plugin-node-resolve";
import terser from "@rollup/plugin-terser";
import { dts } from "rollup-plugin-dts";
import esbuild from "rollup-plugin-esbuild";

/**
 * Shared Rollup library build for every publishable package.
 *
 * Rollup (a bundler on the recognised modern-toolchain list) replaces tsup so the
 * build engine is reported truthfully. Each package emits first-party ESM + CJS +
 * .d.ts, minified, with no external runtime URLs. Runtime assets (translation
 * strings, CSS, icons) stay inlined in source and are bundled in.
 *
 * Externalisation mirrors the previous tsup behaviour exactly: a package's own
 * `dependencies` + `peerDependencies` (and Node built-ins) are left external;
 * everything else is bundled.
 */

const NODE_BUILTINS = new Set([...builtinModules, ...builtinModules.map((m) => `node:${m}`)]);

/** Resolve the source's `.js` import specifiers to the real `.ts`/`.tsx` files. */
function tsJsResolve() {
  return {
    name: "ts-js-resolve",
    async resolveId(source, importer) {
      if (importer && source.startsWith(".") && source.endsWith(".js")) {
        const base = source.slice(0, -3);
        for (const ext of [".ts", ".tsx"]) {
          const resolved = await this.resolve(base + ext, importer, { skipSelf: true });
          if (resolved) return resolved;
        }
      }
      return null;
    },
  };
}

/** Prepend the React Server Components `"use client"` directive AFTER minification. */
function useClientBanner() {
  return {
    name: "use-client-banner",
    renderChunk(code, chunk) {
      if (!chunk.isEntry) return null;
      return { code: `"use client";\n${code}`, map: null };
    },
  };
}

/**
 * @param {object} opts
 * @param {object} opts.pkg            the package's package.json (for externals)
 * @param {Record<string,string>} [opts.entries]  entry map (default { index: "src/index.ts" })
 * @param {boolean} [opts.useClient]   prepend the "use client" directive (react/nextjs)
 * @param {string[]} [opts.formats]    ["esm","cjs"] by default
 * @param {boolean} [opts.dtsBuild]    emit .d.ts (default true)
 * @param {boolean} [opts.sourcemap]   default true
 * @param {string}  [opts.target]      esbuild target (default "es2020")
 * @param {string}  [opts.shebang]     optional shebang banner (cli)
 */
export function createLibConfig({
  pkg,
  entries = { index: "src/index.ts" },
  useClient = false,
  formats = ["esm", "cjs"],
  dtsBuild = true,
  sourcemap = true,
  target = "es2020",
  shebang,
}) {
  const deps = [...Object.keys(pkg.dependencies ?? {}), ...Object.keys(pkg.peerDependencies ?? {})];
  const isExternal = (id) =>
    NODE_BUILTINS.has(id) || deps.some((d) => id === d || id.startsWith(`${d}/`));

  const banner = shebang ? `${shebang}\n` : undefined;

  const outputs = [];
  if (formats.includes("esm")) {
    outputs.push({
      dir: "dist",
      format: "es",
      entryFileNames: "[name].js",
      chunkFileNames: "[name]-[hash].js",
      sourcemap,
      banner,
    });
  }
  if (formats.includes("cjs")) {
    outputs.push({
      dir: "dist",
      format: "cjs",
      entryFileNames: "[name].cjs",
      chunkFileNames: "[name]-[hash].cjs",
      sourcemap,
      exports: "named",
      banner,
    });
  }

  /** @type {import('rollup').RollupOptions[]} */
  const configs = [
    {
      input: entries,
      external: isExternal,
      plugins: [
        tsJsResolve(),
        nodeResolve({ extensions: [".ts", ".tsx", ".mjs", ".js", ".json"] }),
        commonjs(),
        esbuild({ target, jsx: "automatic", sourceMap: sourcemap }),
        terser({ format: { comments: false } }),
        useClient ? useClientBanner() : null,
      ].filter(Boolean),
      output: outputs,
    },
  ];

  if (dtsBuild) {
    configs.push({
      input: entries,
      external: isExternal,
      plugins: [dts()],
      output: { dir: "dist", format: "es", entryFileNames: "[name].d.ts" },
    });
  }

  return configs;
}

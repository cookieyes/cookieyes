#!/usr/bin/env node
/**
 * Per-module size breakdown for `@cookieyes/core` and `@cookieyes/react`.
 *
 * `measure.mjs` answers "how big is it". This answers "what is it made of", so
 * that work goes at the biggest things rather than the most obvious ones.
 *
 * Two numbers per module, because neither alone is enough to decide anything:
 *
 * - **own** — the bytes Rollup rendered for that module, before minification.
 *   These are exact and they sum to the unminified bundle total, so the
 *   breakdown is auditable: if the column does not add up, it is wrong.
 *   Attribution is per-module, not per-export. They are pre-minification
 *   because that is the only point at which per-module boundaries still exist —
 *   terser rewrites across them — so treat `own` as a proportional map of where
 *   the weight is, not as a shipped byte count.
 * - **pullIn** — the compressed size of a bundle whose only entry is that
 *   module. That is what the module costs *including everything it drags in*,
 *   and it is the number that matters when deciding whether a subsystem can be
 *   made optional: a 300-byte module that reaches half the engine saves you 300
 *   bytes, not half the engine.
 *
 * There is deliberately no per-module gzip column. Gzip is not additive — a
 * module's compressed contribution depends on what surrounds it — so such a
 * column could only be an apportionment, i.e. a guess wearing a decimal point.
 * Compressed figures here are only ever reported for a whole bundle that was
 * actually produced.
 *
 * The saving from an actual change is never taken from this file. It comes from
 * `measure.mjs`, which builds real apps. This one says where to look.
 *
 * Usage:
 *   node tools/size/breakdown.mjs
 *   node tools/size/breakdown.mjs --out tools/size/breakdown.json
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { brotliCompressSync, gzipSync, constants as zlibConstants } from "node:zlib";
import terser from "@rollup/plugin-terser";
import { rollup } from "rollup";
import esbuild from "rollup-plugin-esbuild";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, "..", "..");

const args = process.argv.slice(2);
const outPath = resolve(
  args.includes("--out") ? args[args.indexOf("--out") + 1] : join(HERE, "breakdown.json"),
);

const gzip = (code) => gzipSync(Buffer.from(code), { level: 9 }).length;
const brotli = (code) =>
  brotliCompressSync(Buffer.from(code), {
    params: { [zlibConstants.BROTLI_PARAM_QUALITY]: 11 },
  }).length;

/**
 * The two layers, each described by the entry a real app actually pulls.
 *
 * `entry` is deliberately not the package's `index.ts`. Measuring the barrel
 * file would measure every export the package has, including ones no app calls,
 * and would say the whole package is the cost. The entries below are the call
 * sites the consentbench fixture apps use, so the breakdown describes the code
 * that genuinely ships.
 */
const LAYERS = [
  {
    key: "core",
    pkg: join(REPO, "sdk", "core"),
    label: "@cookieyes/core via getOrCreateConsentRuntime()",
    entry: `
      import { getOrCreateConsentRuntime } from "./src/runtime.ts";
      globalThis.__keep = getOrCreateConsentRuntime;
    `,
    external: [],
  },
  {
    key: "interface",
    pkg: join(REPO, "sdk", "react"),
    label: "@cookieyes/react via CookieBanner + CookiePreferences + RecallButton",
    entry: `
      import { CookieBanner } from "./src/presets/CookieBanner.tsx";
      import { CookiePreferences } from "./src/presets/CookiePreferences.tsx";
      import { RecallButton } from "./src/controls/RecallButton.tsx";
      import { createCookieYes } from "./src/runtime.ts";
      globalThis.__keep = [CookieBanner, CookiePreferences, RecallButton, createCookieYes];
    `,
    // React is a peer dependency the host app already ships; counting it would
    // drown the SDK's own code. `@cookieyes/core` is external too, so this
    // layer measures the interface's *own* weight — the figure that lines up
    // with `interfaceOverCore` in measure.mjs. The engine has its own row
    // above; counting it twice would make the two layers look additive when
    // they share code.
    external: ["react", "react-dom", "react/jsx-runtime", "react-dom/client", "@cookieyes/core"],
  },
];

/** Resolve the source's `.js` specifiers to real `.ts`/`.tsx`, as the build does. */
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

/**
 * Bundle `code` as an entry inside `pkgDir` with the shipping plugin stack, and
 * return the generated chunk.
 *
 * The plugin stack mirrors `rollup.shared.mjs` — esbuild then terser, same
 * target — so a byte here corresponds to a byte we publish. It skips the
 * `"use client"` banner and sourcemaps, which do not affect what is measured.
 *
 * `minify` is a parameter rather than always-on because Rollup's per-module
 * `renderedLength` is measured before `renderChunk`, so in a minified build the
 * module map and the chunk total are on different scales and the breakdown does
 * not add up. Compressed totals come from the minified build; the module map
 * comes from the unminified one.
 */
async function bundleFrom(pkgDir, code, external, { minify = true } = {}) {
  const ID = "\0size-breakdown-entry";
  const bundle = await rollup({
    input: ID,
    external: (id) => external.includes(id),
    onwarn(warning, warn) {
      // The synthetic entry has no exports by design (it assigns to a global to
      // defeat tree-shaking), and `"use client"` is meaningless in this
      // analysis bundle — the real build applies it after minification.
      if (["EMPTY_BUNDLE", "MODULE_LEVEL_DIRECTIVE"].includes(warning.code)) return;
      warn(warning);
    },
    plugins: [
      {
        name: "virtual-entry",
        resolveId(source, importer) {
          if (source === ID) return ID;
          // Relative imports from the synthetic entry resolve against the
          // package root, not the virtual module's non-existent directory.
          if (importer === ID && source.startsWith(".")) {
            return this.resolve(join(pkgDir, source), undefined, { skipSelf: true });
          }
          return null;
        },
        load(id) {
          return id === ID ? { code, moduleSideEffects: true } : null;
        },
      },
      tsJsResolve(),
      esbuild({ target: "es2020", jsx: "automatic", sourceMap: false }),
      minify ? terser({ format: { comments: false } }) : null,
    ].filter(Boolean),
  });
  const { output } = await bundle.generate({ format: "es", sourcemap: false });
  const chunk = output.find((o) => o.type === "chunk");
  await bundle.close();
  return chunk;
}

/** Measure one layer: total compressed size plus the per-module `own` column. */
async function measureLayer(layer) {
  const minified = await bundleFrom(layer.pkg, layer.entry, layer.external, { minify: true });
  const readable = await bundleFrom(layer.pkg, layer.entry, layer.external, { minify: false });

  const modules = Object.entries(readable.modules)
    .filter(([id]) => !id.startsWith("\0"))
    .map(([id, mod]) => ({
      module: relative(layer.pkg, id),
      own: mod.renderedLength,
    }))
    .filter((m) => m.own > 0);

  const ownTotal = modules.reduce((sum, m) => sum + m.own, 0);

  // `pullIn` per module: bundle each one on its own, minified, and compress it.
  for (const mod of modules) {
    const single = await bundleFrom(
      layer.pkg,
      `import * as m from ${JSON.stringify(`./${mod.module}`)};\nglobalThis.__keep = m;\n`,
      layer.external,
      { minify: true },
    );
    mod.pullIn = gzip(single.code);
    mod.pullInRaw = single.code.length;
  }
  modules.sort((a, b) => b.pullIn - a.pullIn);

  return {
    label: layer.label,
    bundle: {
      minified: minified.code.length,
      gzip: gzip(minified.code),
      brotli: brotli(minified.code),
      unminified: readable.code.length,
    },
    // Rollup renders a little glue outside any module (the entry's own
    // statements, hoisted helpers, the export block). Reporting the residual
    // keeps the column honest instead of silently folding it into the largest
    // module — and it is the check that `own` really does add up.
    ownTotal,
    unattributed: readable.code.length - ownTotal,
    modules,
  };
}

const layers = {};
for (const layer of LAYERS) {
  process.stderr.write(`analysing ${layer.key} … `);
  layers[layer.key] = await measureLayer(layer);
  process.stderr.write(`${layers[layer.key].modules.length} modules\n`);
}

const versions = {};
for (const pkg of ["core", "react"]) {
  const manifest = JSON.parse(readFileSync(join(REPO, "sdk", pkg, "package.json"), "utf8"));
  versions[manifest.name] = manifest.version;
}

const report = {
  method: {
    document: "tools/size/README.md",
    summary:
      "Per-module breakdown of the code each layer's real entry point pulls in. " +
      "'own' is exact minified bytes rendered for that module and sums to the bundle total. " +
      "'pullIn' is the gzipped size of a bundle containing only that module and its transitive " +
      "imports. Per-module gzip is deliberately not reported: gzip is not additive.",
    plugins: "esbuild(es2020) + terser, mirroring rollup.shared.mjs",
  },
  measuredAt: new Date().toISOString(),
  versions,
  layers,
};

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`);

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

const fmt = (bytes) => (bytes / 1024).toFixed(2).padStart(8);
for (const [key, layer] of Object.entries(layers)) {
  process.stdout.write(`\n${key} — ${layer.label}\n`);
  process.stdout.write(
    `bundle: ${(layer.bundle.minified / 1024).toFixed(2)} KB minified, ` +
      `${(layer.bundle.gzip / 1024).toFixed(2)} KB gzip, ` +
      `${(layer.bundle.brotli / 1024).toFixed(2)} KB brotli\n`,
  );
  process.stdout.write(
    `module map below is pre-minification (${(layer.bundle.unminified / 1024).toFixed(2)} KB total)\n`,
  );
  process.stdout.write(`${"─".repeat(72)}\n`);
  process.stdout.write(
    `${"module".padEnd(44)}${"own KB".padStart(10)}${"pullIn KB".padStart(12)}\n`,
  );
  for (const mod of layer.modules) {
    process.stdout.write(
      `${mod.module.padEnd(44)}${fmt(mod.own)}${fmt(mod.pullIn).padStart(12)}\n`,
    );
  }
  process.stdout.write(`${"─".repeat(72)}\n`);
  process.stdout.write(
    `${"attributed".padEnd(44)}${fmt(layer.ownTotal)}\n` +
      `${"glue outside any module".padEnd(44)}${fmt(layer.unattributed)}\n`,
  );
}
process.stdout.write(`\nreport: ${relative(REPO, outPath)}\n`);

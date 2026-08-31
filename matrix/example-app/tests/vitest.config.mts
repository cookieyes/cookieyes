// matrix/example-app/tests/vitest.config.mts
//
// Config for the jsdom behaviour test only (Test B). The SSR test
// (ssr.assert.mjs, Test A) is a plain Node script invoked directly by
// run-combination.mjs against a real `next start` server — it needs real
// `fetch`/HTTP, not jsdom, so it is deliberately not wired into vitest here.
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Rooted one level up from this file (the example-app's package root), not
// wherever vitest happens to be invoked from — `test:behaviour` runs this via
// `--config tests/vitest.config.mts`, and `include` below is relative to
// `root`, not to this config file's own directory.
const exampleAppRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

export default defineConfig({
  root: exampleAppRoot,
  // Explicit, not left to tsconfig.json auto-detection: across vite majors
  // (this matrix intentionally lets `next`/`react` float per combination,
  // which drags vite/vitest along with it via peer resolution — see the
  // pnpm.overrides note in scaffold-example-app.mjs for the general shape of
  // this problem), whether esbuild picks up "jsx": "react-jsx" from
  // tsconfig.json for files transformed under a custom `--config` path is
  // not reliable, and Vite 8's newer default transform engine (`oxc`) does
  // not honour `esbuild.jsx` at all — it silently wins over `esbuild`
  // options and falls back to the classic runtime, so every test fails with
  // "ReferenceError: React is not defined". `oxc: false` forces the esbuild
  // transform (which does honour `esbuild.jsx` below) regardless of which
  // vite major this combination's `next`/`react` pins happened to drag in —
  // a toolchain-stability fix, not anything about the SDK under test.
  oxc: false,
  esbuild: {
    jsx: "automatic",
    jsxImportSource: "react",
  },
  test: {
    environment: "jsdom",
    include: ["tests/behaviour.test.tsx"],
    globals: false,
  },
});

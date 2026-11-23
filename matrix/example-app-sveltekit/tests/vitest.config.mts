// matrix/example-app-sveltekit/tests/vitest.config.mts
//
// Config for the jsdom behaviour test only. The server-render assertions (ssr.assert.mjs) run over
// HTTP against the built server in plain Node and are deliberately not wired in here. The
// SvelteKit plugin is what resolves `$app/*`, which the package's entry imports for its handle.
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vitest/config";

// Rooted one level up (the app's package root), not wherever vitest is invoked from: `include`
// below is relative to `root`, not to this config file's directory.
const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

export default defineConfig({
  root: appRoot,
  plugins: [sveltekit()],
  // The `browser` condition makes `svelte` resolve its client runtime, so `mount` exists in jsdom.
  resolve: { conditions: ["browser"] },
  test: {
    environment: "jsdom",
    include: ["tests/behaviour.test.ts"],
    globals: false,
  },
});

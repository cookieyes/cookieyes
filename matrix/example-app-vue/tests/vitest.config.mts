// matrix/example-app-vue/tests/vitest.config.mts
//
// Config for the jsdom behaviour test only. The server-render assertions (ssr.assert.mjs) run
// against the `vite build --ssr` output in plain Node and are deliberately not wired in here.
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vitest/config";

// Rooted one level up (the app's package root), not wherever vitest is invoked from: `include`
// below is relative to `root`, not to this config file's directory.
const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

export default defineConfig({
  root: appRoot,
  plugins: [vue()],
  test: {
    environment: "jsdom",
    include: ["tests/behaviour.test.ts"],
    globals: false,
  },
});

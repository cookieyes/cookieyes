// matrix/example-app-nuxt/tests/vitest.config.mts
//
// Config for the behaviour test only. It runs in @nuxt/test-utils' Nuxt environment, so the
// module's plugin, its auto-imports and <CookieYesRoot /> run inside this combination's Nuxt, on a
// jsdom page. The server-render assertions (ssr.assert.mjs) run against the built server instead
// and are deliberately not wired in here.
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineVitestConfig } from "@nuxt/test-utils/config";

// Rooted one level up (the app's package root), not wherever vitest is invoked from: `include`
// below is relative to `root`, and Nuxt loads the app from `rootDir`.
const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

export default defineVitestConfig({
  root: appRoot,
  test: {
    environment: "nuxt",
    environmentOptions: { nuxt: { rootDir: appRoot, domEnvironment: "jsdom" } },
    include: ["tests/behaviour.test.ts"],
    globals: false,
  },
});

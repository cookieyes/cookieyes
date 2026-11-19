import { defineConfig } from "vitest/config";

/**
 * Builds and serves a real Nuxt app with the built module, then loads it in Chromium: the server
 * HTML and hydration for each kind of visitor. Separate from `vitest.config.ts` so the default run
 * stays fast and needs no browser or build.
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/__tests__/**/*.browser.test.ts"],
    globalSetup: ["test/global-setup.ts"],
    testTimeout: 30_000,
    hookTimeout: 180_000,
  },
});

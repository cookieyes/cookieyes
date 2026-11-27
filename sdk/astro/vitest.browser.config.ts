import { defineConfig } from "vitest/config";

/**
 * Builds the fixture site with the built integration, static and on-request, and loads it in
 * Chromium: first paint for each kind of visitor and the client router. Separate from
 * `vitest.config.ts` so the default run stays fast and needs no browser.
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

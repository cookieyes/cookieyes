import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";

/**
 * The conformance suite in real Chromium, where focus moves and keys are
 * pressed by the browser itself rather than simulated. Separate from
 * `vitest.config.ts` so the default run stays fast and needs no browser.
 */
export default defineConfig({
  // Vue's esm-bundler build expects these compile-time flags from the app's bundler and warns
  // when they are missing; values match a production Vue 3 app built with Vite.
  define: {
    __VUE_OPTIONS_API__: "false",
    __VUE_PROD_DEVTOOLS__: "false",
    __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: "true",
  },
  test: {
    include: ["src/__tests__/**/*.browser.test.ts"],
    browser: {
      enabled: true,
      headless: true,
      provider: playwright(),
      instances: [{ browser: "chromium" }],
    },
  },
});

import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";

/**
 * The conformance suite in real Chromium, where focus moves and keys are
 * pressed by the browser itself rather than simulated. Separate from
 * `vitest.config.ts` so the default run stays fast and needs no browser.
 */
export default defineConfig({
  test: {
    include: ["src/__tests__/**/*.browser.test.{ts,tsx}"],
    browser: {
      enabled: true,
      headless: true,
      provider: playwright(),
      instances: [{ browser: "chromium" }],
    },
  },
});

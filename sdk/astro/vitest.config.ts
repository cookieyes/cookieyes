import { fileURLToPath } from "node:url";
import { mergeConfig } from "vitest/config";
import { sharedTestConfig } from "../../vitest.shared.js";

export default mergeConfig(sharedTestConfig, {
  resolve: {
    // The middleware's config module exists only inside an Astro build.
    alias: {
      "virtual:cookieyes/config": fileURLToPath(
        new URL("src/__tests__/stubs/virtual-config.ts", import.meta.url),
      ),
    },
  },
  test: {
    environment: "node",
    include: ["src/__tests__/**/*.test.ts"],
    // Loads the built fixture site in Chromium: `vitest.browser.config.ts`.
    exclude: ["src/__tests__/**/*.browser.test.ts"],
  },
});

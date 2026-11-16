import { fileURLToPath } from "node:url";
import { mergeConfig } from "vitest/config";
import { sharedTestConfig } from "../../vitest.shared.js";

export default mergeConfig(sharedTestConfig, {
  resolve: {
    // Nitro's virtual module exists only inside a Nuxt build.
    alias: {
      "#imports": fileURLToPath(new URL("src/__tests__/stubs/imports.ts", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["src/__tests__/**/*.test.ts"],
    // Builds and serves a real Nuxt app in Chromium: `vitest.browser.config.ts`.
    exclude: ["src/__tests__/**/*.browser.test.ts"],
  },
});

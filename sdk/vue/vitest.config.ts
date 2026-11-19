import { mergeConfig } from "vitest/config";
import { sharedTestConfig } from "../../vitest.shared.js";

export default mergeConfig(sharedTestConfig, {
  test: {
    environment: "jsdom",
    include: ["src/__tests__/**/*.test.ts"],
    // The real-browser run has its own config: `vitest.browser.config.ts`.
    exclude: ["src/__tests__/**/*.browser.test.ts"],
  },
});

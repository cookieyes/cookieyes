import { mergeConfig } from "vitest/config";
import { sharedTestConfig } from "../../vitest.shared.js";

/**
 * `environment: "node"`: this is server code, and a DOM in the test environment
 * would hide a browser global slipping into it.
 */
export default mergeConfig(sharedTestConfig, {
  test: {
    environment: "node",
    include: ["src/__tests__/**/*.test.ts"],
  },
});

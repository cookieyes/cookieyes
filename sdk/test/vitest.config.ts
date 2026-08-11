import { mergeConfig } from "vitest/config";
import { sharedTestConfig } from "../../vitest.shared.js";

/**
 * `environment: "node"` is deliberate and load-bearing: this package's whole
 * promise is that consent can be tested without a browser. If the headless
 * harness ever needs a DOM, this config fails and we find out immediately rather
 * than shipping a jsdom dependency to consumers.
 *
 * The React entry point is the one exception, and it opts in per file with a
 * `// @vitest-environment jsdom` docblock — React cannot render without a DOM.
 * Keeping node as the default means that exception stays visible instead of
 * quietly becoming the norm.
 */
export default mergeConfig(sharedTestConfig, {
  test: {
    environment: "node",
    include: ["src/__tests__/**/*.test.{ts,tsx}"],
  },
});

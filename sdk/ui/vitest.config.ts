import { mergeConfig } from "vitest/config";
import { sharedTestConfig } from "../../vitest.shared.js";

// Node, not jsdom: the package must load with no browser present. Tests that need
// a DOM opt in per file with `// @vitest-environment jsdom`.
export default mergeConfig(sharedTestConfig, {
  test: {
    environment: "node",
    include: ["src/__tests__/**/*.test.ts"],
  },
});

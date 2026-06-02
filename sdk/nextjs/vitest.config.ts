import { mergeConfig } from "vitest/config";
import { sharedTestConfig } from "../../vitest.shared.js";

// @cookieyes/nextjs is a pure re-export barrel (only src/index.ts). The smoke
// test imports the barrel, executing every re-export, so the 80% gate holds
// here too — it guards against the barrel silently dropping an export.
export default mergeConfig(sharedTestConfig, {
  test: {
    environment: "node",
    include: ["src/__tests__/**/*.test.ts"],
  },
});

import { mergeConfig } from "vitest/config";
import { sharedTestConfig } from "../../vitest.shared.js";

export default mergeConfig(sharedTestConfig, {
  test: {
    environment: "jsdom",
    include: ["src/__tests__/**/*.test.{ts,tsx}"],
  },
});

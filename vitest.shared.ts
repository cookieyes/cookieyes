import { defineConfig } from "vitest/config";

/**
 * Shared test configuration for every publishable package.
 *
 * Each package's `vitest.config.ts` merges this base so coverage is measured
 * and gated uniformly across the monorepo. Per-package configs only override
 * `test.environment` and `test.include`.
 *
 * Every package is gated at 80% across all four metrics. The thresholds apply
 * to the aggregate of each package's source. Keep them at 80+ — raise as
 * coverage improves, never lower them to make a build pass.
 */
export const sharedTestConfig = defineConfig({
  test: {
    globals: false,
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      // Measure the source we ship — not tests or test helpers.
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/**/__tests__/**", "src/**/*.test.{ts,tsx}"],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
  },
});

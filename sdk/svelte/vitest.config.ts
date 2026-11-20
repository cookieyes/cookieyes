import { svelte } from "@sveltejs/vite-plugin-svelte";
import { svelteTesting } from "@testing-library/svelte/vite";
import { mergeConfig } from "vitest/config";
import { sharedTestConfig } from "../../vitest.shared.js";

export default mergeConfig(sharedTestConfig, {
  // `svelteTesting` adds the `browser` resolve condition, so `mount` exists under jsdom.
  plugins: [svelte(), svelteTesting()],
  test: {
    environment: "jsdom",
    include: ["src/__tests__/**/*.test.ts"],
    // The real-browser run has its own config: `vitest.browser.config.ts`.
    exclude: ["src/__tests__/**/*.browser.test.ts"],
    coverage: {
      // The shared include covers `.ts`; the components and runes modules are `.svelte` files.
      include: ["src/**/*.{ts,svelte}"],
      exclude: ["src/**/__tests__/**", "src/**/*.test.{ts,tsx}", "src/**/*.d.ts"],
    },
  },
});

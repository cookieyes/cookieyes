import { fileURLToPath } from "node:url";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { svelteTesting } from "@testing-library/svelte/vite";
import { mergeConfig } from "vitest/config";
import { sharedTestConfig } from "../../vitest.shared.js";

const stub = (name: string) =>
  fileURLToPath(new URL(`src/__tests__/stubs/${name}`, import.meta.url));

export default mergeConfig(sharedTestConfig, {
  // `svelteTesting` adds the `browser` resolve condition, so `mount` exists under jsdom.
  plugins: [svelte(), svelteTesting()],
  resolve: {
    // These modules exist only inside a SvelteKit build.
    alias: {
      "$app/environment": stub("app-environment.ts"),
      "$app/paths": stub("app-paths.ts"),
    },
  },
  test: {
    environment: "jsdom",
    include: ["src/__tests__/**/*.test.ts"],
    // Builds and serves a real SvelteKit app in Chromium: `vitest.browser.config.ts`.
    exclude: ["src/__tests__/**/*.browser.test.ts"],
    coverage: {
      // The shared include covers `.ts`; the root component is a `.svelte` file.
      include: ["src/**/*.{ts,svelte}"],
      exclude: ["src/**/__tests__/**", "src/**/*.test.{ts,tsx}", "src/**/*.d.ts"],
    },
  },
});

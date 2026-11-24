import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";
import { createRenderer } from "./src/__tests__/ssr-html.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));

/**
 * A browser cannot render on a server, so the first-paint test gets the server's HTML for one
 * page from this module, rendered in Node before the browser starts.
 */
const serverBanner = {
  name: "server-banner",
  resolveId: (id: string) => (id === "virtual:server-banner" ? "\0virtual:server-banner" : null),
  async load(id: string) {
    if (id !== "\0virtual:server-banner") return null;
    const renderer = await createRenderer();
    try {
      const { body } = await renderer.render(join(HERE, "src/__tests__/fixtures/SsrPage.svelte"), {
        spec: { regulation: "GDPR", parts: ["banner"] },
      });
      return `export default ${JSON.stringify(body)};`;
    } finally {
      await renderer.close();
    }
  },
};

/**
 * The conformance suite in real Chromium, where focus moves and keys are
 * pressed by the browser itself rather than simulated. Separate from
 * `vitest.config.ts` so the default run stays fast and needs no browser.
 */
export default defineConfig({
  plugins: [svelte(), serverBanner],
  // Svelte's package picks its client entry (the one with `mount`) by this condition.
  resolve: { conditions: ["browser"] },
  test: {
    include: ["src/__tests__/**/*.browser.test.ts"],
    browser: {
      enabled: true,
      headless: true,
      provider: playwright(),
      instances: [{ browser: "chromium" }],
    },
  },
});

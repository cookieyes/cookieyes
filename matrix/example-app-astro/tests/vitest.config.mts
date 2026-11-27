// matrix/example-app-astro/tests/vitest.config.mts
//
// Config for the jsdom behaviour test only. The server-render assertions (ssr.assert.mjs) run over
// HTTP against the built server in plain Node and are deliberately not wired in here. The package
// is inlined because its client entry reads `import.meta.env`, which Vite defines only in modules
// it transforms.
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Rooted one level up (the app's package root), not wherever vitest is invoked from: `include`
// below is relative to `root`, not to this config file's directory.
const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

export default defineConfig({
  root: appRoot,
  test: {
    environment: "jsdom",
    include: ["tests/behaviour.test.ts"],
    globals: false,
    server: { deps: { inline: [/@cookieyes\//] } },
  },
});

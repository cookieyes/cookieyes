import { defineConfig } from "@playwright/test";

const PORT = 5391;

export default defineConfig({
  testDir: "./e2e",
  testMatch: "*.spec.ts",
  fullyParallel: true,
  reporter: "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
  },
  webServer: {
    command: `node e2e/csp-server.mjs`,
    port: PORT,
    reuseExistingServer: !process.env.CI,
    env: { CSP_FIXTURE_PORT: String(PORT) },
  },
});

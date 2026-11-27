// The site the build and browser tests use, against the built integration in ../../../dist. One
// config, two builds: static (FIXTURE_OUTPUT unset) and server, with the Node adapter. A static
// build prerenders /live too, because a page rendered on request needs an adapter.
import node from "@astrojs/node";
import { defineConfig } from "astro/config";
import cookieyes from "../../../dist/index.js";

const server = process.env.FIXTURE_OUTPUT === "server";

export default defineConfig({
  outDir: process.env.FIXTURE_OUT_DIR || "dist",
  output: server ? "server" : "static",
  ...(server ? { adapter: node({ mode: "standalone" }) } : {}),
  ...(process.env.FIXTURE_CSP ? { security: { csp: true } } : {}),
  devToolbar: { enabled: false },
  telemetry: false,
  integrations: [
    cookieyes({
      region: { map: { "US-CA": "CCPA" } },
      googleConsentMode: true,
      // Requests to this host wait for analytics consent: the integration registers the blocker.
      networkBlocker: {
        rules: [{ id: "probe", domain: "blocked.example", category: "analytics" }],
      },
    }),
    {
      name: "fixture-static-live",
      hooks: {
        "astro:route:setup": ({ route }) => {
          if (!server && route.component.endsWith("live.astro")) route.prerender = true;
        },
      },
    },
  ],
});

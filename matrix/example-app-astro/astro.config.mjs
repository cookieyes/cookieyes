import node from "@astrojs/node";
import cookieyes from "@cookieyes/astro";
import { defineConfig } from "astro/config";

// The region map is what lets one build serve a GDPR visitor and, by geo header, a California
// visitor the CCPA banner. `output: "server"` with the Node adapter, so the matrix can send real
// requests; the prerendered page is the static case.
export default defineConfig({
  output: "server",
  adapter: node({ mode: "standalone" }),
  devToolbar: { enabled: false },
  telemetry: false,
  integrations: [
    cookieyes({
      mode: "cookie-only",
      region: { map: { "US-CA": "CCPA" } },
      googleConsentMode: true,
    }),
  ],
});

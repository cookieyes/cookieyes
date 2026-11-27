import cookieyes from "@cookieyes/astro";
import { defineConfig } from "astro/config";

export default defineConfig({
  devToolbar: { enabled: false },
  telemetry: false,
  integrations: [cookieyes()],
});

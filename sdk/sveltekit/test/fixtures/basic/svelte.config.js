import { fileURLToPath } from "node:url";
import adapter from "@sveltejs/adapter-node";
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";
import { CRITICAL_CSS_HASH } from "../../../dist/styles.js";

const dist = (file) => fileURLToPath(new URL(`../../../dist/${file}`, import.meta.url));

// A minimal app the server-render and hydration tests build and serve with the built package.
// The CSP is what a strict site sets: scripts by nonce (or hash on prerendered pages) and the
// critical CSS by the hash the package publishes, so a violation shows up as a console error.
/** @type {import("@sveltejs/kit").Config} */
export default {
  preprocess: vitePreprocess(),
  kit: {
    adapter: adapter({ out: process.env.FIXTURE_OUTPUT_DIR || "build" }),
    // The package under test is the one in `dist/`, as an app that installed it would resolve.
    alias: {
      "@cookieyes/sveltekit/styles-route": dist("styles-route.js"),
      "@cookieyes/sveltekit": dist("index.js"),
    },
    csp: {
      mode: "auto",
      directives: {
        "script-src": ["self"],
        "style-src": ["self", CRITICAL_CSS_HASH],
        // SvelteKit's own route announcer sets a style attribute. The SDK sets none, which the
        // server HTML test asserts.
        "style-src-attr": ["unsafe-inline"],
      },
    },
  },
};

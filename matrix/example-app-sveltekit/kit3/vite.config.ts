import adapterNode from "@sveltejs/adapter-node";
import adapterStatic from "@sveltejs/adapter-static";
import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vite";

// SvelteKit 3 takes its config as the options of this plugin; there is no svelte.config.js.
export default defineConfig({
  plugins: [
    sveltekit({
      adapter:
        process.env.CY_ADAPTER === "static"
          ? adapterStatic({ pages: "build-static", assets: "build-static" })
          : adapterNode(),
    }),
  ],
});

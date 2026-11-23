import adapterNode from "@sveltejs/adapter-node";
import adapterStatic from "@sveltejs/adapter-static";
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";

// SvelteKit 2 reads its config here. Kit 3 reads it from `sveltekit({ ... })` in vite.config.ts
// instead, and the scaffold script swaps this file for kit3/vite.config.ts on those legs.
// `CY_ADAPTER=static` is how the extra adapter-static build of the same app picks its adapter.
/** @type {import("@sveltejs/kit").Config} */
export default {
  preprocess: vitePreprocess(),
  kit: {
    adapter:
      process.env.CY_ADAPTER === "static"
        ? adapterStatic({ pages: "build-static", assets: "build-static" })
        : adapterNode(),
  },
};

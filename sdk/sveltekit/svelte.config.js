import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";

// Preprocessing TypeScript here means the published `.svelte` files are plain JavaScript, so a
// consumer's toolchain needs no TypeScript support to compile them.
export default {
  preprocess: vitePreprocess({ script: true }),
};

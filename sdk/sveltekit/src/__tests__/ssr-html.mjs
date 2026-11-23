// Renders a Svelte page on the server with Vite compiling it for the server (`generate:
// "server"`). Shared by the SSR server process the jsdom tests talk to and by the browser
// config, which needs the HTML of one page before the browser starts.
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);

/** Starts a Vite server in middleware mode and returns a renderer over it. */
export async function createRenderer() {
  // `vite` is not a direct dependency of this package; resolve the copy the Svelte plugin uses.
  const pluginRequire = createRequire(require.resolve("@sveltejs/vite-plugin-svelte"));
  const { createServer } = await import(pathToFileURL(pluginRequire.resolve("vite")).href);
  const { svelte } = await import("@sveltejs/vite-plugin-svelte");
  const server = await createServer({
    configFile: false,
    logLevel: "error",
    appType: "custom",
    // `$app/environment` exists only inside a SvelteKit build; `server-consent.ts` imports it.
    resolve: {
      alias: {
        "$app/environment": fileURLToPath(new URL("./stubs/app-environment.ts", import.meta.url)),
      },
    },
    plugins: [svelte({ compilerOptions: { dev: true } })],
    server: { middlewareMode: true, hmr: false, ws: false, watch: null },
  });
  const { render } = await server.ssrLoadModule("svelte/server");
  return {
    async render(fixture, props) {
      const page = await server.ssrLoadModule(fixture);
      const output = render(page.default, { props });
      // Read explicitly: from Svelte 5.58 the result is lazy and does not spread.
      return { body: output.body, head: output.head };
    },
    close: () => server.close(),
  };
}

// A server process for the SSR tests, so a render happens where there is no `window` at all, as
// on a real server. The test process, which runs jsdom for hydration, asks it for HTML over IPC.
import { createRenderer } from "./ssr-html.mjs";

const renderer = await createRenderer();

process.on("message", async (message) => {
  const { id, fixture, props } = message;
  try {
    const { body, head } = await renderer.render(fixture, props);
    process.send({ id, body, head });
  } catch (error) {
    process.send({ id, error: String(error?.stack ?? error) });
  }
});
process.on("disconnect", () => renderer.close().finally(() => process.exit(0)));
process.send({ ready: true });

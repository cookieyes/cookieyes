import { afterEach, describe, expect, it } from "vitest";
import { devTrackScript } from "../dev-queue.js";

/** Declared locally — see the identical note in core's `deprecations.ts`. */
declare const process: { env: { NODE_ENV?: string | undefined } };

type DevQueueEntry = { k: string; t: number; d: unknown };
type DevGlobal = typeof globalThis & { __COOKIEYES_DEVTOOLS__?: DevQueueEntry[] };

const originalNodeEnv = process.env.NODE_ENV;

afterEach(() => {
  process.env.NODE_ENV = originalNodeEnv;
  delete (globalThis as DevGlobal).__COOKIEYES_DEVTOOLS__;
});

function script(id: string, src: string): HTMLScriptElement {
  const el = document.createElement("script");
  el.id = id;
  el.src = src;
  return el;
}

describe("devTrackScript", () => {
  it("records an injected script as managed on the devtools queue", () => {
    process.env.NODE_ENV = "development";
    devTrackScript(script("cky-script-chat", "https://chat.example.com/w.js"), "functional");
    const queue = (globalThis as DevGlobal).__COOKIEYES_DEVTOOLS__ ?? [];
    expect(queue.map((e) => e.k)).toEqual(["s"]);
    expect(queue[0]?.d).toEqual({
      id: "cky-script-chat",
      src: "https://chat.example.com/w.js",
      category: "functional",
      via: "integration",
    });
  });

  it("records nothing in production", () => {
    process.env.NODE_ENV = "production";
    devTrackScript(script("cky-script-chat", "https://chat.example.com/w.js"));
    expect((globalThis as DevGlobal).__COOKIEYES_DEVTOOLS__).toBeUndefined();
  });
});

// @vitest-environment node
import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";
import { loadConsent } from "../load.js";

const locals = (extra: Record<string, unknown> = {}) =>
  ({
    cookieyes: {
      read: true,
      initialConsent: null,
      region: "US-CA",
      forcedRegion: undefined,
      gpc: true,
      ...extra,
    },
  }) as App.Locals;

describe("loadConsent", () => {
  it("returns what the handle read as data.consent", () => {
    expect(loadConsent({ locals: locals() })).toEqual({
      consent: { read: true, initialConsent: null, region: "US-CA", forcedRegion: undefined },
    });
  });

  it("keeps Sec-GPC on the server", () => {
    expect(loadConsent({ locals: locals() }).consent).not.toHaveProperty("gpc");
  });

  it("drops any field it does not name, so a later local cannot reach the browser", () => {
    expect(Object.keys(loadConsent({ locals: locals({ secret: "x" }) }).consent).sort()).toEqual([
      "forcedRegion",
      "initialConsent",
      "read",
      "region",
    ]);
  });

  it("returns plain JSON-safe data that SvelteKit can serialise", () => {
    const initialConsent = { hasActed: true, categories: { necessary: true } };
    const { consent } = loadConsent({ locals: locals({ initialConsent }) });
    // devalue, which SvelteKit serialises with, accepts plain data; the round trip through JSON
    // loses nothing but the undefined field, which devalue keeps.
    expect(JSON.parse(JSON.stringify(consent))).toEqual({
      read: true,
      initialConsent,
      region: "US-CA",
    });
    expect(Object.getPrototypeOf(consent)).toBe(Object.prototype);
  });

  it("survives devalue.stringify and parse, the serialiser SvelteKit uses, with no loss", () => {
    // devalue is SvelteKit's own dependency, so it is loaded from where SvelteKit resolves it.
    const fromKit = createRequire(
      createRequire(import.meta.url).resolve("@sveltejs/kit/package.json"),
    );
    const devalue = fromKit("devalue") as {
      stringify: (value: unknown) => string;
      parse: (text: string) => unknown;
    };
    const initialConsent = { hasActed: true, categories: { necessary: true, analytics: false } };
    const { consent } = loadConsent({ locals: locals({ initialConsent }) });
    expect(devalue.parse(devalue.stringify(consent))).toEqual(consent);
  });

  it("explains the missing handle", () => {
    expect(() => loadConsent({ locals: {} as App.Locals })).toThrow("cookieyesHandle(config)");
  });
});

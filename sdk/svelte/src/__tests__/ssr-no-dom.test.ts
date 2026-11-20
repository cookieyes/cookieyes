// @vitest-environment node
import { describe, expect, it } from "vitest";
import { renderOnServer, useServerRenderer } from "./ssr-render.js";

useServerRenderer();

describe("server rendering without a DOM", () => {
  it("runs here with no document or window, as the server process does", () => {
    expect(typeof document).toBe("undefined");
    expect(typeof window).toBe("undefined");
  });

  it("renders the banner where there is no document or window", async () => {
    // The render happens in a process that has no `window` at all, so any hook or component that
    // reached for the DOM during setup would throw a ReferenceError here.
    const { body } = await renderOnServer({ parts: ["banner"], regulation: "GDPR" });
    expect(body).toContain("data-cky-banner");
    expect(body).toContain("Accept All");
  });

  it("calls every state hook and returns the server snapshot", async () => {
    const { body } = await renderOnServer({ parts: ["state"], regulation: "CCPA" });
    const json = /<pre data-probe="">([^<]*)<\/pre>/.exec(body)?.[1] ?? "";
    const state = JSON.parse(json.replace(/&quot;/g, '"')) as Record<string, unknown>;
    expect(state).toMatchObject({
      hasActed: false,
      regulation: "CCPA",
      region: "CCPA",
      visible: true,
      prefs: false,
      optOut: false,
      language: "en",
      reload: false,
      title: "We value your privacy",
    });
    // CCPA is opt-out, so the fresh-visitor snapshot has every category on.
    expect(Object.values(state.categories as Record<string, boolean>).every(Boolean)).toBe(true);
    expect(state.analytics).toBe(true);
  });
});

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { useConsent } from "../hooks/useConsent.svelte.js";
import { getCookieYes } from "../runtime.js";
import ConsentProbe from "./fixtures/ConsentProbe.svelte";
import {
  clearCookie,
  cookieOnly,
  mountWith,
  renderHook,
  settle,
  unmountAll,
} from "./test-utils.js";

beforeEach(clearCookie);
afterEach(unmountAll);

describe("useConsent", () => {
  it("reflects the runtime and updates on action", () => {
    const { result } = renderHook(() => useConsent(), cookieOnly("GDPR"));
    expect(result.regulation).toBe("GDPR");
    expect(result.hasActed).toBe(false);
    expect(result.categories.necessary).toBe(true);
    getCookieYes().manager.acceptAll();
    expect(result.hasActed).toBe(true);
    expect(result.categories.analytics).toBe(true);
  });

  it("has the same fields as the snapshot, and survives Object.keys and JSON", () => {
    const { result } = renderHook(() => useConsent(), cookieOnly("GDPR"));
    expect(Object.keys(result)).toEqual(Object.keys(getCookieYes().getSnapshot()));
    expect("hasActed" in result).toBe(true);
    expect(JSON.parse(JSON.stringify(result)).regulation).toBe("GDPR");
  });

  it("re-renders a template that reads it when consent changes", async () => {
    const view = mountWith(cookieOnly("GDPR"), ConsentProbe);
    expect(view.container.textContent).toBe("false:false");
    getCookieYes().manager.acceptAll();
    await settle();
    expect(view.container.textContent).toBe("true:true");
  });
});

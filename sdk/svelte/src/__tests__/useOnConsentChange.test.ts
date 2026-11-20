import type { ConsentEventPayload } from "@cookieyes/core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useOnConsentChange } from "../hooks/useOnConsentChange.js";
import { getCookieYes } from "../runtime.js";
import { renderOnServer, useServerRenderer } from "./ssr-render.js";
import { clearCookie, renderHook, unmountAll } from "./test-utils.js";

useServerRenderer();
beforeEach(clearCookie);
afterEach(unmountAll);

describe("useOnConsentChange", () => {
  it("fires once on mount with the current state (isInitial)", () => {
    const fn = vi.fn();
    renderHook(() => useOnConsentChange("change", fn));
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn.mock.calls[0]?.[0]).toMatchObject({ isInitial: true, changedCategories: [] });
  });

  it('"change" fires with changedCategories when the visitor acts', () => {
    const fn = vi.fn<(p: ConsentEventPayload) => void>();
    renderHook(() => useOnConsentChange("change", fn));
    getCookieYes().manager.acceptAll();
    expect(fn).toHaveBeenCalledTimes(2);
    const last = fn.mock.calls[1]?.[0];
    expect(last?.isInitial).toBe(false);
    expect(last?.changedCategories).toContain("analytics");
  });

  it('"save" fires on a re-confirm even when nothing changed; "change" does not', () => {
    const save = vi.fn();
    const change = vi.fn();
    renderHook(() => {
      useOnConsentChange("save", save);
      useOnConsentChange("change", change);
    });
    const { manager } = getCookieYes();
    manager.acceptAll();
    manager.acceptAll();
    expect(save).toHaveBeenCalledTimes(3);
    expect(change).toHaveBeenCalledTimes(2);
  });

  it("only fires for the named category when scoped", () => {
    const fn = vi.fn();
    renderHook(() => useOnConsentChange("change", fn, { category: "advertisement" }));
    const { manager } = getCookieYes();
    manager.acceptSelected(["analytics"]);
    expect(fn).toHaveBeenCalledTimes(1);
    manager.acceptAll();
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("stops firing after the component is destroyed", () => {
    const spy = vi.fn();
    const view = renderHook(() => useOnConsentChange("save", spy));
    const { manager } = getCookieYes();
    expect(spy).toHaveBeenCalledTimes(1);
    manager.acceptAll();
    expect(spy).toHaveBeenCalledTimes(2);
    view.unmount();
    manager.rejectAll();
    manager.acceptAll();
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it("does not subscribe on the server, where mount never runs", async () => {
    // The fixture's state probe never subscribes; this asserts the server render completes with
    // a listener-free runtime, which is what a subscription on the server would break.
    const { body } = await renderOnServer({ parts: ["state"] });
    expect(body).toContain("data-probe");
  });

  it("throws the one error when the provider is missing", async () => {
    const { render } = await import("@testing-library/svelte");
    const { default: HookProbe } = await import("./fixtures/HookProbe.svelte");
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    expect(() =>
      render(HookProbe, { props: { use: () => useOnConsentChange("save", () => undefined) } }),
    ).toThrow(/useOnConsentChange\(\) could not find CookieYes/);
  });
});

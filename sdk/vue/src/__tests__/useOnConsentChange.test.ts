import type { ConsentEventPayload } from "@cookieyes/core";
import { mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defineComponent, effectScope, h } from "vue";
import { useOnConsentChange } from "../composables/useOnConsentChange.js";
import { getCookieYes } from "../runtime.js";
import {
  clearCookie,
  cookieOnly,
  installOnly,
  renderComposable,
  unmountAll,
} from "./test-utils.js";

beforeEach(clearCookie);
afterEach(unmountAll);

describe("useOnConsentChange", () => {
  it("fires once on mount with the current state (isInitial)", () => {
    const fn = vi.fn();
    renderComposable(() => useOnConsentChange("change", fn));
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn.mock.calls[0]?.[0]).toMatchObject({ isInitial: true, changedCategories: [] });
  });

  it('"change" fires with changedCategories when the visitor acts', () => {
    const fn = vi.fn<(p: ConsentEventPayload) => void>();
    renderComposable(() => useOnConsentChange("change", fn));
    getCookieYes().manager.acceptAll();
    expect(fn).toHaveBeenCalledTimes(2);
    const last = fn.mock.calls[1]?.[0];
    expect(last?.isInitial).toBe(false);
    expect(last?.changedCategories).toContain("analytics");
  });

  it('"save" fires on a re-confirm even when nothing changed; "change" does not', () => {
    const save = vi.fn();
    const change = vi.fn();
    renderComposable(() => {
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
    renderComposable(() => useOnConsentChange("change", fn, { category: "advertisement" }));
    const { manager } = getCookieYes();
    manager.acceptSelected(["analytics"]);
    expect(fn).toHaveBeenCalledTimes(1);
    manager.acceptAll();
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("stops firing after the component unmounts", () => {
    const spy = vi.fn();
    const { wrapper } = renderComposable(() => useOnConsentChange("save", spy));
    const { manager } = getCookieYes();
    expect(spy).toHaveBeenCalledTimes(1);
    manager.acceptAll();
    expect(spy).toHaveBeenCalledTimes(2);
    wrapper.unmount();
    manager.rejectAll();
    manager.acceptAll();
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it("subscribes at once inside an effect scope and stops when the scope stops", () => {
    const app = installOnly(cookieOnly());
    const spy = vi.fn();
    const scope = effectScope();
    app.runWithContext(() => scope.run(() => useOnConsentChange("save", spy)));
    expect(spy).toHaveBeenCalledTimes(1);
    getCookieYes().manager.acceptAll();
    expect(spy).toHaveBeenCalledTimes(2);
    scope.stop();
    getCookieYes().manager.rejectAll();
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it("does not subscribe on the server, where mount never runs", async () => {
    const { ssr } = await import("./test-utils.js");
    const spy = vi.fn();
    await ssr(
      () =>
        defineComponent({
          setup() {
            useOnConsentChange("save", spy);
            return () => h("div");
          },
        }),
      cookieOnly(),
    );
    expect(spy).not.toHaveBeenCalled();
  });

  it("throws the one error when the plugin is missing", () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const Comp = defineComponent({
      setup() {
        useOnConsentChange("save", () => undefined);
        return () => h("div");
      },
    });
    expect(() => mount(Comp)).toThrow(/useOnConsentChange\(\) could not find CookieYes/);
  });
});

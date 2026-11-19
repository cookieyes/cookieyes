import { mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defineComponent, h } from "vue";
import { useConsentRuntime } from "../composables/useConsentRuntime.js";
import { getCookieYes } from "../runtime.js";
import { clearCookie, cookieOnly, renderComposable, unmountAll } from "./test-utils.js";

beforeEach(clearCookie);
afterEach(unmountAll);

describe("useConsentRuntime", () => {
  it("returns the runtime the plugin started", () => {
    const { result } = renderComposable(() => useConsentRuntime(), cookieOnly());
    expect(result).toBe(getCookieYes());
  });

  it("throws the one error when the plugin is missing", () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const Comp = defineComponent({
      setup() {
        useConsentRuntime();
        return () => h("div");
      },
    });
    expect(() => mount(Comp)).toThrow(
      "[cookieyes] useConsentRuntime() could not find CookieYes. Add app.use(CookieYes, config) before mounting the app.",
    );
  });

  it("throws with the setup() tail when called outside setup", () => {
    expect(() => useConsentRuntime()).toThrow(
      /before mounting the app, and call composables inside setup\(\) or app\.runWithContext\(\)\./,
    );
  });
});

import { render } from "@testing-library/svelte";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useConsentRuntime } from "../hooks/useConsentRuntime.js";
import { getCookieYes } from "../runtime.js";
import HookProbe from "./fixtures/HookProbe.svelte";
import { clearCookie, cookieOnly, renderHook, unmountAll } from "./test-utils.js";

beforeEach(clearCookie);
afterEach(unmountAll);

describe("useConsentRuntime", () => {
  it("returns the runtime the provider started", () => {
    const { result } = renderHook(() => useConsentRuntime(), cookieOnly());
    expect(result).toBe(getCookieYes());
  });

  it("throws the one error when the provider is missing", () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    expect(() => render(HookProbe, { props: { use: () => useConsentRuntime() } })).toThrow(
      "[cookieyes] useConsentRuntime() could not find CookieYes. Wrap the app in <CookieYesProvider config={...}> and call hooks while a component initialises.",
    );
  });

  it("throws the same error when called outside a component", () => {
    expect(() => useConsentRuntime()).toThrow(/could not find CookieYes/);
  });
});

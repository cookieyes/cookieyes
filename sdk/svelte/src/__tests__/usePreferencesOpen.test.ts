import { render } from "@testing-library/svelte";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { usePreferencesOpen } from "../hooks/usePreferencesOpen.svelte.js";
import { getCookieYes } from "../runtime.js";
import HookProbe from "./fixtures/HookProbe.svelte";
import { clearCookie, cookieOnly, renderHook, unmountAll } from "./test-utils.js";

beforeEach(clearCookie);
afterEach(unmountAll);

describe("usePreferencesOpen", () => {
  it("returns a reactive boolean read through current, like the other Svelte state hooks", () => {
    const { result } = renderHook(() => usePreferencesOpen(), cookieOnly());
    expect(Object.keys(result)).toEqual(["current"]);
    expect(typeof result.current).toBe("boolean");
  });

  it("is closed by default", () => {
    const { result } = renderHook(() => usePreferencesOpen(), cookieOnly());
    expect(result.current).toBe(false);
  });

  it("opens and closes with the manager", () => {
    const { result } = renderHook(() => usePreferencesOpen(), cookieOnly());
    getCookieYes().manager.showPreferences();
    expect(result.current).toBe(true);
    getCookieYes().manager.hidePreferences();
    expect(result.current).toBe(false);
  });

  it("throws the one error when the provider is missing", () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    expect(() => render(HookProbe, { props: { use: () => usePreferencesOpen() } })).toThrow(
      "[cookieyes] usePreferencesOpen() could not find CookieYes. Wrap the app in <CookieYesProvider config={...}> and call hooks while a component initialises.",
    );
  });
});

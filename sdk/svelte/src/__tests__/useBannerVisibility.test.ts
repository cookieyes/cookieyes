import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { useBannerVisibility } from "../hooks/useBannerVisibility.svelte.js";
import { useOptOutOpen } from "../hooks/useOptOutOpen.svelte.js";
import { usePreferencesOpen } from "../hooks/usePreferencesOpen.svelte.js";
import { getCookieYes } from "../runtime.js";
import { clearCookie, cookieOnly, renderHook, unmountAll } from "./test-utils.js";

beforeEach(clearCookie);
afterEach(unmountAll);

describe("useBannerVisibility", () => {
  it("is visible before the user acts", () => {
    expect(renderHook(() => useBannerVisibility(), cookieOnly()).result.current).toBe(true);
  });

  it("hides once the user acts", () => {
    const { result } = renderHook(() => useBannerVisibility(), cookieOnly());
    getCookieYes().manager.acceptAll();
    expect(result.current).toBe(false);
  });

  it("hides while the preferences dialog is open", () => {
    const { result } = renderHook(() => useBannerVisibility(), cookieOnly());
    getCookieYes().manager.showPreferences();
    expect(result.current).toBe(false);
  });

  it("hides while the opt-out dialog is open", () => {
    const { result } = renderHook(() => useBannerVisibility(), cookieOnly("CCPA"));
    getCookieYes().showOptOut();
    expect(result.current).toBe(false);
  });
});

describe("usePreferencesOpen", () => {
  it("opens and closes with the manager", () => {
    const { result } = renderHook(() => usePreferencesOpen(), cookieOnly());
    expect(result.current).toBe(false);
    getCookieYes().manager.showPreferences();
    expect(result.current).toBe(true);
    getCookieYes().manager.hidePreferences();
    expect(result.current).toBe(false);
  });
});

describe("useOptOutOpen", () => {
  it("opens and closes with the runtime", () => {
    const { result } = renderHook(() => useOptOutOpen(), cookieOnly("CCPA"));
    expect(result.current).toBe(false);
    getCookieYes().showOptOut();
    expect(result.current).toBe(true);
    getCookieYes().hideOptOut();
    expect(result.current).toBe(false);
  });
});

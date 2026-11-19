import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { useBannerVisibility } from "../composables/useBannerVisibility.js";
import { useOptOutOpen } from "../composables/useOptOutOpen.js";
import { usePreferencesOpen } from "../composables/usePreferencesOpen.js";
import { getCookieYes } from "../runtime.js";
import { clearCookie, cookieOnly, renderComposable, unmountAll } from "./test-utils.js";

beforeEach(clearCookie);
afterEach(unmountAll);

describe("useBannerVisibility", () => {
  it("is visible before the user acts", () => {
    expect(renderComposable(() => useBannerVisibility(), cookieOnly()).result.value).toBe(true);
  });

  it("hides once the user acts", () => {
    const { result } = renderComposable(() => useBannerVisibility(), cookieOnly());
    getCookieYes().manager.acceptAll();
    expect(result.value).toBe(false);
  });

  it("hides while the preferences dialog is open", () => {
    const { result } = renderComposable(() => useBannerVisibility(), cookieOnly());
    getCookieYes().manager.showPreferences();
    expect(result.value).toBe(false);
  });

  it("hides while the opt-out dialog is open", () => {
    const { result } = renderComposable(() => useBannerVisibility(), cookieOnly("CCPA"));
    getCookieYes().showOptOut();
    expect(result.value).toBe(false);
  });
});

describe("usePreferencesOpen", () => {
  it("opens and closes with the manager", () => {
    const { result } = renderComposable(() => usePreferencesOpen(), cookieOnly());
    expect(result.value).toBe(false);
    getCookieYes().manager.showPreferences();
    expect(result.value).toBe(true);
    getCookieYes().manager.hidePreferences();
    expect(result.value).toBe(false);
  });
});

describe("useOptOutOpen", () => {
  it("opens and closes with the runtime", () => {
    const { result } = renderComposable(() => useOptOutOpen(), cookieOnly("CCPA"));
    expect(result.value).toBe(false);
    getCookieYes().showOptOut();
    expect(result.value).toBe(true);
    getCookieYes().hideOptOut();
    expect(result.value).toBe(false);
  });
});

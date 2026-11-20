import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { useConsentCategory } from "../hooks/useConsentCategory.svelte.js";
import { getCookieYes } from "../runtime.js";
import { clearCookie, cookieOnly, renderHook, unmountAll } from "./test-utils.js";

beforeEach(clearCookie);
afterEach(unmountAll);

describe("useConsentCategory", () => {
  it("is false for non-necessary categories before consent", () => {
    const { result } = renderHook(() => useConsentCategory("analytics"), cookieOnly());
    expect(result.current).toBe(false);
  });

  it("is true for necessary, always", () => {
    const { result } = renderHook(() => useConsentCategory("necessary"), cookieOnly());
    expect(result.current).toBe(true);
  });

  it("becomes true once the category is granted", () => {
    const { result } = renderHook(() => useConsentCategory("analytics"), cookieOnly());
    getCookieYes().manager.acceptAll();
    expect(result.current).toBe(true);
  });

  it("ignores an unsaved toggle", () => {
    const { result } = renderHook(() => useConsentCategory("analytics"), cookieOnly());
    getCookieYes().manager.updateCategory("analytics", true);
    expect(result.current).toBe(false);
  });

  it("follows a getter argument", () => {
    let name = "necessary";
    const { result } = renderHook(() => useConsentCategory(() => name), cookieOnly());
    expect(result.current).toBe(true);
    name = "analytics";
    getCookieYes().manager.rejectAll();
    expect(result.current).toBe(false);
  });
});

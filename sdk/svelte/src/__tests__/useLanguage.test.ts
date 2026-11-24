import type { PartialTranslations } from "@cookieyes/core";
import { render } from "@testing-library/svelte";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useLanguage } from "../hooks/useLanguage.svelte.js";
import HookProbe from "./fixtures/HookProbe.svelte";
import { clearCookie, cookieOnly, renderHook, unmountAll } from "./test-utils.js";

const fr: PartialTranslations = { acceptAll: "Tout accepter" };
const ar: PartialTranslations = { acceptAll: "قبول الكل" };

// The field names of React's useLanguage(). Listed here, not read from the Svelte object, so a
// renamed or dropped field fails this test.
const REACT_FIELDS = ["language", "direction", "languages", "setLanguage"];

beforeEach(clearCookie);
afterEach(unmountAll);

describe("useLanguage", () => {
  it("returns the same field names as React's useLanguage", () => {
    const { result } = renderHook(() => useLanguage(), cookieOnly());
    expect(Object.keys(result)).toEqual(REACT_FIELDS);
  });

  it("reports the starting language and its direction", () => {
    const { result } = renderHook(() => useLanguage(), {
      mode: "cookie-only",
      i18n: { messages: { fr }, locale: "fr" },
    });
    expect(result.language).toBe("fr");
    expect(result.direction).toBe("ltr");
    expect(result.languages).toContain("fr");
    expect(result.languages).toContain("en");
  });

  it("switches language live and updates the reported language", async () => {
    const { result } = renderHook(() => useLanguage(), {
      mode: "cookie-only",
      i18n: { messages: { fr } },
    });
    expect(result.language).toBe("en");
    await result.setLanguage("fr");
    expect(result.language).toBe("fr");
  });

  it("reports rtl for a right-to-left language", async () => {
    const { result } = renderHook(() => useLanguage(), {
      mode: "cookie-only",
      i18n: { messages: { ar } },
    });
    await result.setLanguage("ar");
    expect(result.direction).toBe("rtl");
  });

  it("warns and keeps the language when it is not available and there is no loader", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const { result } = renderHook(() => useLanguage(), {
      mode: "cookie-only",
      i18n: { messages: { fr } },
    });
    await result.setLanguage("de");
    expect(result.language).toBe("en");
    expect(warn).toHaveBeenCalled();
  });

  it("throws the one error when the provider is missing", () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    expect(() => render(HookProbe, { props: { use: () => useLanguage() } })).toThrow(
      "[cookieyes] useLanguage() could not find CookieYes. Wrap the app in <CookieYesProvider config={...}> and call hooks while a component initialises.",
    );
  });
});

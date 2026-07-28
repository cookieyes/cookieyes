import type { PartialTranslations } from "@cookieyes/core";
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useLanguage } from "../hooks/useLanguage.js";
import { useTranslations } from "../hooks/useTranslations.js";
import { initCookieYes, resetCookieYes } from "../runtime.js";
import { clearCookie } from "./test-utils.js";

const fr: PartialTranslations = { acceptAll: "Tout accepter" };
const ar: PartialTranslations = { acceptAll: "قبول الكل" };

beforeEach(clearCookie);
afterEach(() => {
  cleanup();
  resetCookieYes();
  clearCookie();
});

describe("useLanguage", () => {
  it("reports the starting language and its direction", () => {
    initCookieYes({ mode: "cookie-only", i18n: { messages: { fr }, locale: "fr" } });
    const { result } = renderHook(() => useLanguage());

    expect(result.current.language).toBe("fr");
    expect(result.current.direction).toBe("ltr");
    expect(result.current.languages).toContain("fr");
    expect(result.current.languages).toContain("en");
  });

  it("switches language live and re-renders text, no reload", () => {
    initCookieYes({ mode: "cookie-only", i18n: { messages: { fr } } });
    const lang = renderHook(() => useLanguage());
    const text = renderHook(() => useTranslations());

    expect(text.result.current.acceptAll).toBe("Accept All"); // English to start

    act(() => {
      void lang.result.current.setLanguage("fr");
    });

    expect(lang.result.current.language).toBe("fr");
    expect(text.result.current.acceptAll).toBe("Tout accepter"); // French now
    // A string not provided in French falls back to English.
    expect(text.result.current.rejectAll).toBe("Reject All");
  });

  it("switches back to English without a loader or warning", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    initCookieYes({ mode: "cookie-only", i18n: { messages: { fr } } }); // no "en" entry
    const lang = renderHook(() => useLanguage());
    const text = renderHook(() => useTranslations());

    act(() => {
      void lang.result.current.setLanguage("fr");
    });
    expect(text.result.current.acceptAll).toBe("Tout accepter");

    act(() => {
      void lang.result.current.setLanguage("en");
    });
    expect(lang.result.current.language).toBe("en");
    expect(text.result.current.acceptAll).toBe("Accept All");
    expect(warn).not.toHaveBeenCalled(); // English is the base — never "missing"
  });

  it("reports rtl for a right-to-left language", () => {
    initCookieYes({ mode: "cookie-only", i18n: { messages: { ar } } });
    const { result } = renderHook(() => useLanguage());
    act(() => {
      void result.current.setLanguage("ar");
    });
    expect(result.current.direction).toBe("rtl");
  });

  it("loads a language on demand via loadLanguage", async () => {
    const loadLanguage = vi.fn(async (): Promise<PartialTranslations> => fr);
    initCookieYes({ mode: "cookie-only", i18n: { loadLanguage } });
    const lang = renderHook(() => useLanguage());
    const text = renderHook(() => useTranslations());

    await act(async () => {
      await lang.result.current.setLanguage("fr");
    });

    expect(loadLanguage).toHaveBeenCalledWith("fr");
    expect(text.result.current.acceptAll).toBe("Tout accepter");
  });

  it("warns and stays put when a language isn't available and there's no loader", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    initCookieYes({ mode: "cookie-only", i18n: { messages: { fr } } });
    const { result } = renderHook(() => useLanguage());

    act(() => {
      void result.current.setLanguage("de");
    });

    expect(result.current.language).toBe("en"); // unchanged
    expect(warn).toHaveBeenCalled();
  });

  it("is SSR-safe: sensible defaults when no runtime is mounted", () => {
    const { result } = renderHook(() => useLanguage());
    expect(result.current.language).toBe("en");
    expect(result.current.direction).toBe("ltr");
    expect(() => result.current.setLanguage("fr")).not.toThrow();
  });
});

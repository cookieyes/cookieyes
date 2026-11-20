import type { PartialTranslations } from "@cookieyes/core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useLanguage } from "../hooks/useLanguage.svelte.js";
import { useTranslations } from "../hooks/useTranslations.svelte.js";
import { clearCookie, cookieOnly, renderHook, unmountAll } from "./test-utils.js";

const fr: PartialTranslations = { acceptAll: "Tout accepter" };
const ar: PartialTranslations = { acceptAll: "قبول الكل" };

beforeEach(clearCookie);
afterEach(unmountAll);

describe("useTranslations", () => {
  it("returns the default English catalog", () => {
    expect(renderHook(() => useTranslations(), cookieOnly()).result.acceptAll).toBe("Accept All");
  });

  it("returns a provided locale catalog", () => {
    const { result } = renderHook(() => useTranslations(), {
      mode: "cookie-only",
      i18n: { messages: { fr }, locale: "fr" },
    });
    expect(result.acceptAll).toBe("Tout accepter");
  });
});

describe("useLanguage", () => {
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

  it("switches language live and updates text, no reload", async () => {
    const { result } = renderHook(() => ({ lang: useLanguage(), text: useTranslations() }), {
      mode: "cookie-only",
      i18n: { messages: { fr } },
    });
    expect(result.text.acceptAll).toBe("Accept All");
    await result.lang.setLanguage("fr");
    expect(result.lang.language).toBe("fr");
    expect(result.text.acceptAll).toBe("Tout accepter");
    expect(result.text.rejectAll).toBe("Reject All");
  });

  it("switches back to English without a loader or warning", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const { result } = renderHook(() => ({ lang: useLanguage(), text: useTranslations() }), {
      mode: "cookie-only",
      i18n: { messages: { fr } },
    });
    await result.lang.setLanguage("fr");
    await result.lang.setLanguage("en");
    expect(result.lang.language).toBe("en");
    expect(result.text.acceptAll).toBe("Accept All");
    expect(warn).not.toHaveBeenCalled();
  });

  it("reports rtl for a right-to-left language", async () => {
    const { result } = renderHook(() => useLanguage(), {
      mode: "cookie-only",
      i18n: { messages: { ar } },
    });
    await result.setLanguage("ar");
    expect(result.direction).toBe("rtl");
  });

  it("loads a language on demand via loadLanguage", async () => {
    const loadLanguage = vi.fn(async (): Promise<PartialTranslations> => fr);
    const { result } = renderHook(() => ({ lang: useLanguage(), text: useTranslations() }), {
      mode: "cookie-only",
      i18n: { loadLanguage },
    });
    await result.lang.setLanguage("fr");
    expect(loadLanguage).toHaveBeenCalledWith("fr");
    expect(result.text.acceptAll).toBe("Tout accepter");
  });

  it("warns and stays put when a language is not available and there is no loader", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const { result } = renderHook(() => useLanguage(), {
      mode: "cookie-only",
      i18n: { messages: { fr } },
    });
    await result.setLanguage("de");
    expect(result.language).toBe("en");
    expect(warn).toHaveBeenCalled();
  });
});

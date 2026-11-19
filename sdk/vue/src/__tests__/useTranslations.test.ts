import type { PartialTranslations } from "@cookieyes/core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useLanguage } from "../composables/useLanguage.js";
import { useTranslations } from "../composables/useTranslations.js";
import { clearCookie, cookieOnly, renderComposable, unmountAll } from "./test-utils.js";

const fr: PartialTranslations = { acceptAll: "Tout accepter" };
const ar: PartialTranslations = { acceptAll: "قبول الكل" };

beforeEach(clearCookie);
afterEach(unmountAll);

describe("useTranslations", () => {
  it("returns the default English catalog", () => {
    expect(renderComposable(() => useTranslations(), cookieOnly()).result.value.acceptAll).toBe(
      "Accept All",
    );
  });

  it("returns a provided locale catalog", () => {
    const { result } = renderComposable(() => useTranslations(), {
      mode: "cookie-only",
      i18n: { messages: { fr }, locale: "fr" },
    });
    expect(result.value.acceptAll).toBe("Tout accepter");
  });
});

describe("useLanguage", () => {
  it("reports the starting language and its direction", () => {
    const { result } = renderComposable(() => useLanguage(), {
      mode: "cookie-only",
      i18n: { messages: { fr }, locale: "fr" },
    });
    expect(result.language.value).toBe("fr");
    expect(result.direction.value).toBe("ltr");
    expect(result.languages.value).toContain("fr");
    expect(result.languages.value).toContain("en");
  });

  it("switches language live and updates text, no reload", async () => {
    const { result } = renderComposable(() => ({ lang: useLanguage(), text: useTranslations() }), {
      mode: "cookie-only",
      i18n: { messages: { fr } },
    });
    expect(result.text.value.acceptAll).toBe("Accept All");
    await result.lang.setLanguage("fr");
    expect(result.lang.language.value).toBe("fr");
    expect(result.text.value.acceptAll).toBe("Tout accepter");
    expect(result.text.value.rejectAll).toBe("Reject All");
  });

  it("switches back to English without a loader or warning", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const { result } = renderComposable(() => ({ lang: useLanguage(), text: useTranslations() }), {
      mode: "cookie-only",
      i18n: { messages: { fr } },
    });
    await result.lang.setLanguage("fr");
    await result.lang.setLanguage("en");
    expect(result.lang.language.value).toBe("en");
    expect(result.text.value.acceptAll).toBe("Accept All");
    expect(warn).not.toHaveBeenCalled();
  });

  it("reports rtl for a right-to-left language", async () => {
    const { result } = renderComposable(() => useLanguage(), {
      mode: "cookie-only",
      i18n: { messages: { ar } },
    });
    await result.setLanguage("ar");
    expect(result.direction.value).toBe("rtl");
  });

  it("loads a language on demand via loadLanguage", async () => {
    const loadLanguage = vi.fn(async (): Promise<PartialTranslations> => fr);
    const { result } = renderComposable(() => ({ lang: useLanguage(), text: useTranslations() }), {
      mode: "cookie-only",
      i18n: { loadLanguage },
    });
    await result.lang.setLanguage("fr");
    expect(loadLanguage).toHaveBeenCalledWith("fr");
    expect(result.text.value.acceptAll).toBe("Tout accepter");
  });

  it("warns and stays put when a language is not available and there is no loader", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const { result } = renderComposable(() => useLanguage(), {
      mode: "cookie-only",
      i18n: { messages: { fr } },
    });
    await result.setLanguage("de");
    expect(result.language.value).toBe("en");
    expect(warn).toHaveBeenCalled();
  });
});

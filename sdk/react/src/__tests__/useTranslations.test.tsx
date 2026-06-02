import { cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { useTranslations } from "../hooks/useTranslations.js";
import { createCookieYes, resetCookieYes } from "../runtime.js";
import { clearCookie, mountOffline, teardown } from "./test-utils.js";

beforeEach(clearCookie);
afterEach(() => {
  cleanup();
  teardown();
});

describe("useTranslations", () => {
  it("returns the default English catalog when no runtime is mounted", () => {
    const { result } = renderHook(() => useTranslations());
    expect(result.current.acceptAll).toBe("Accept All");
  });

  it("returns the default English catalog from a mounted runtime", () => {
    mountOffline("GDPR");
    const { result } = renderHook(() => useTranslations());
    expect(result.current.acceptAll).toBe("Accept All");
  });

  it("returns a provided locale catalog", () => {
    resetCookieYes();
    const fr = {
      ...{
        bannerTitle: "",
        bannerDescription: "",
        acceptAll: "Tout accepter",
        rejectAll: "",
        managePreferences: "",
        savePreferences: "",
        doNotSell: "",
        ccpaDescription: "",
        accept: "",
        poweredBy: "",
        preferencesTitle: "",
        preferencesIntro: "",
        categories: {
          necessary: { label: "", description: "" },
          functional: { label: "", description: "" },
          analytics: { label: "", description: "" },
          performance: { label: "", description: "" },
          advertisement: { label: "", description: "" },
        },
        optOut: {
          title: "",
          description: "",
          cancel: "",
          successText: "",
          successCountdown: "",
        },
      },
    };
    createCookieYes().mode("offline").i18n({ messages: { fr }, locale: "fr" }).mount();
    const { result } = renderHook(() => useTranslations());
    expect(result.current.acceptAll).toBe("Tout accepter");
  });
});

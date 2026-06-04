import { describe, expect, it } from "vitest";
import * as react from "../index.js";

/**
 * Guards the public surface of @cookieyes/react. @cookieyes/nextjs re-exports
 * this barrel wholesale, so a dropped export here breaks both packages.
 */
describe("@cookieyes/react public exports", () => {
  const EXPECTED = [
    "createCookieYes",
    "getCookieYes",
    "resetCookieYes",
    "CookieBanner",
    "CookiePreferences",
    "CookieOptOut",
    "Banner",
    "Preferences",
    "OptOut",
    "RecallButton",
    "GatedScript",
    "GatedFrame",
    "useConsent",
    "useConsentActions",
    "useConsentCategory",
    "useConsentRuntime",
    "useRegulation",
    "useTranslations",
    "useBannerVisibility",
    "usePreferencesOpen",
    "useOptOutOpen",
    "defaultTranslations",
    "resolveTranslations",
    "getOrCreateConsentRuntime",
    "resetConsentRuntime",
  ] as const;

  it.each(EXPECTED)("exports %s", (name) => {
    expect(react[name as keyof typeof react]).toBeDefined();
  });

  it("exposes the namespaced primitive slots", () => {
    expect(react.Banner.Root).toBeDefined();
    expect(react.Banner.AcceptAll).toBeDefined();
    expect(react.Preferences.Category).toBeDefined();
    expect(react.OptOut.Save).toBeDefined();
  });
});

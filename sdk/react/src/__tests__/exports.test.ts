import { describe, expect, it } from "vitest";
import * as react from "../index.js";

/**
 * Guards the public surface of @cookieyes/react. @cookieyes/nextjs re-exports
 * this barrel wholesale, so a dropped export here breaks both packages.
 */
describe("@cookieyes/react public exports", () => {
  const EXPECTED = [
    // Re-exported from @cookieyes/core/network-blocker on purpose, and load
    // bearing: the `networkBlocker` config key lives on this package's config
    // type, so the function that activates it has to be reachable from this
    // package. A consumer who installed only @cookieyes/react cannot resolve
    // @cookieyes/core at all under pnpm's strict layout, which is what the
    // published docs used to tell them to do.
    "registerNetworkBlocker",
    "CookieYesProvider",
    "readServerConsent",
    "createCookieYes",
    "initCookieYes",
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

/**
 * The network blocker ships as its own entry point so that consumers who do not
 * use it do not download it. That split only works if this package re-exports
 * the *registration* function and nothing else: re-exporting the imperative
 * pair would give a second, undocumented path to the same feature, and omitting
 * registration entirely would leave the `networkBlocker` config key on this
 * package unusable from this package.
 */
describe("network blocker surface", () => {
  it("re-exports registerNetworkBlocker, so the config key is usable here", () => {
    expect(typeof react.registerNetworkBlocker).toBe("function");
  });

  it("does not re-export the imperative install/uninstall pair", () => {
    // The config key stays the only declarative path in this package; the
    // imperative functions live at @cookieyes/core/network-blocker.
    expect(react).not.toHaveProperty("installNetworkBlocker");
    expect(react).not.toHaveProperty("uninstallNetworkBlocker");
  });
});

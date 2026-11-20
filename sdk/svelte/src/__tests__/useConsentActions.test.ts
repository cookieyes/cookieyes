import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { useConsent } from "../hooks/useConsent.svelte.js";
import { useConsentActions } from "../hooks/useConsentActions.js";
import { clearCookie, cookieOnly, renderHook, unmountAll } from "./test-utils.js";

beforeEach(clearCookie);
afterEach(unmountAll);

function setup(regulation: "GDPR" | "CCPA" = "GDPR") {
  return renderHook(
    () => ({ consent: useConsent(), actions: useConsentActions() }),
    cookieOnly(regulation),
  ).result;
}

describe("useConsentActions", () => {
  it("acceptAll grants every category", () => {
    const { consent, actions } = setup();
    actions.acceptAll();
    expect(consent.categories.advertisement).toBe(true);
  });

  it("rejectAll keeps only the necessary category", () => {
    const { consent, actions } = setup();
    actions.acceptAll();
    actions.rejectAll();
    expect(consent.categories.analytics).toBe(false);
    expect(consent.categories.necessary).toBe(true);
  });

  it("acceptSelected grants only the chosen categories", () => {
    const { consent, actions } = setup();
    actions.acceptSelected(["analytics"]);
    expect(consent.categories.analytics).toBe(true);
    expect(consent.categories.advertisement).toBe(false);
  });

  it("updateCategory toggles one category without marking acted", () => {
    const { consent, actions } = setup();
    actions.updateCategory("functional", true);
    expect(consent.categories.functional).toBe(true);
    expect(consent.hasActed).toBe(false);
  });

  it("save commits the toggles as set", () => {
    const { consent, actions } = setup();
    actions.updateCategory("functional", true);
    actions.save();
    expect(consent.committedCategories.functional).toBe(true);
    expect(consent.hasActed).toBe(true);
  });

  it("showPreferences and hidePreferences drive the dialog flag", () => {
    const { consent, actions } = setup();
    actions.showPreferences();
    expect(consent.isPreferencesOpen).toBe(true);
    actions.hidePreferences();
    expect(consent.isPreferencesOpen).toBe(false);
  });

  it("showOptOut and hideOptOut drive the opt-out flag", () => {
    const { consent, actions } = setup("CCPA");
    actions.showOptOut();
    expect(consent.isOptOutOpen).toBe(true);
    actions.hideOptOut();
    expect(consent.isOptOutOpen).toBe(false);
  });

  it("dismissBanner closes the banner without a decision", () => {
    const { consent, actions } = setup();
    actions.dismissBanner();
    expect(consent.isBannerDismissed).toBe(true);
    expect(consent.hasActed).toBe(false);
  });

  it("reset clears consent back to defaults", () => {
    const { consent, actions } = setup();
    actions.acceptAll();
    expect(consent.hasActed).toBe(true);
    actions.reset();
    expect(consent.hasActed).toBe(false);
  });
});

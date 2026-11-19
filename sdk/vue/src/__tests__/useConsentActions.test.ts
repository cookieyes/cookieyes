import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { useConsent } from "../composables/useConsent.js";
import { useConsentActions } from "../composables/useConsentActions.js";
import { clearCookie, cookieOnly, renderComposable, unmountAll } from "./test-utils.js";

beforeEach(clearCookie);
afterEach(unmountAll);

function setup(regulation: "GDPR" | "CCPA" = "GDPR") {
  const both = renderComposable(
    () => ({ consent: useConsent(), actions: useConsentActions() }),
    cookieOnly(regulation),
  );
  return both.result;
}

describe("useConsentActions", () => {
  it("acceptAll grants every category", () => {
    const { consent, actions } = setup();
    actions.acceptAll();
    expect(consent.value.categories.advertisement).toBe(true);
  });

  it("rejectAll keeps only the necessary category", () => {
    const { consent, actions } = setup();
    actions.acceptAll();
    actions.rejectAll();
    expect(consent.value.categories.analytics).toBe(false);
    expect(consent.value.categories.necessary).toBe(true);
  });

  it("acceptSelected grants only the chosen categories", () => {
    const { consent, actions } = setup();
    actions.acceptSelected(["analytics"]);
    expect(consent.value.categories.analytics).toBe(true);
    expect(consent.value.categories.advertisement).toBe(false);
  });

  it("updateCategory toggles one category without marking acted", () => {
    const { consent, actions } = setup();
    actions.updateCategory("functional", true);
    expect(consent.value.categories.functional).toBe(true);
    expect(consent.value.hasActed).toBe(false);
  });

  it("save commits the toggles as set", () => {
    const { consent, actions } = setup();
    actions.updateCategory("functional", true);
    actions.save();
    expect(consent.value.committedCategories.functional).toBe(true);
    expect(consent.value.hasActed).toBe(true);
  });

  it("showPreferences and hidePreferences drive the dialog flag", () => {
    const { consent, actions } = setup();
    actions.showPreferences();
    expect(consent.value.isPreferencesOpen).toBe(true);
    actions.hidePreferences();
    expect(consent.value.isPreferencesOpen).toBe(false);
  });

  it("showOptOut and hideOptOut drive the opt-out flag", () => {
    const { consent, actions } = setup("CCPA");
    actions.showOptOut();
    expect(consent.value.isOptOutOpen).toBe(true);
    actions.hideOptOut();
    expect(consent.value.isOptOutOpen).toBe(false);
  });

  it("dismissBanner closes the banner without a decision", () => {
    const { consent, actions } = setup();
    actions.dismissBanner();
    expect(consent.value.isBannerDismissed).toBe(true);
    expect(consent.value.hasActed).toBe(false);
  });

  it("reset clears consent back to defaults", () => {
    const { consent, actions } = setup();
    actions.acceptAll();
    expect(consent.value.hasActed).toBe(true);
    actions.reset();
    expect(consent.value.hasActed).toBe(false);
  });
});

import type { CookieYesConfig } from "@cookieyes/core";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import CookiePreferences from "../presets/CookiePreferences.svelte";
import { getCookieYes } from "../runtime.js";
import {
  clearCookie,
  click,
  cookieOnly,
  getByText,
  mountWith,
  queryByText,
  settle,
  unmountAll,
} from "./test-utils.js";

beforeEach(clearCookie);
afterEach(unmountAll);

async function mountPreferences(config: CookieYesConfig = cookieOnly("GDPR"), open = true) {
  const wrapper = mountWith(config, CookiePreferences);
  if (open) getCookieYes().manager.showPreferences();
  await settle();
  return wrapper;
}

describe("CookiePreferences", () => {
  it("renders nothing while the dialog is closed", async () => {
    await mountPreferences(cookieOnly("GDPR"), false);
    expect(document.querySelector("[role=dialog]")).toBeNull();
  });

  it("renders the dialog with category labels once opened", async () => {
    await mountPreferences();
    expect(getByText("Customise Consent Preferences")).toBeTruthy();
    expect(getByText("Necessary")).toBeTruthy();
    expect(getByText("Analytics")).toBeTruthy();
    expect(getByText("Save My Preferences")).toBeTruthy();
  });

  it("toggles a category and persists on Save", async () => {
    await mountPreferences();
    const firstSwitch = document.querySelectorAll<HTMLElement>('[role="switch"]')[0];
    if (!firstSwitch) throw new Error("expected at least one category switch");
    await click(firstSwitch);
    expect(getCookieYes().getSnapshot().categories.functional).toBe(true);

    await click(getByText("Save My Preferences"));
    const snapshot = getCookieYes().getSnapshot();
    expect(snapshot.isPreferencesOpen).toBe(false);
    expect(snapshot.hasActed).toBe(true);
    expect(snapshot.committedCategories.functional).toBe(true);
  });

  it("closes on Escape and from its close button", async () => {
    await mountPreferences();
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    await settle();
    expect(getCookieYes().getSnapshot().isPreferencesOpen).toBe(false);

    getCookieYes().manager.showPreferences();
    await settle();
    await click(document.querySelector('button[aria-label="Close preferences"]'));
    expect(getCookieYes().getSnapshot().isPreferencesOpen).toBe(false);
  });

  it("moves focus into the dialog when it opens", async () => {
    await mountPreferences();
    expect(document.activeElement).toBe(document.querySelector("[role=dialog]"));
  });

  it("applies Accept All and Reject All from inside the dialog", async () => {
    await mountPreferences();
    await click(getByText("Accept All"));
    expect(getCookieYes().getSnapshot().committedCategories.analytics).toBe(true);
    getCookieYes().manager.showPreferences();
    await settle();
    await click(getByText("Reject All"));
    expect(getCookieYes().getSnapshot().committedCategories.analytics).toBe(false);
  });

  describe("configurable categories", () => {
    it("renders a custom taxonomy's labels instead of the built-in five", async () => {
      await mountPreferences({
        mode: "cookie-only",
        regulation: "GDPR",
        categories: [
          { id: "essential", required: true, label: "Strictly Essential" },
          { id: "marketing", label: "Marketing & Ads" },
        ],
      });

      expect(getByText("Strictly Essential")).toBeTruthy();
      expect(getByText("Marketing & Ads")).toBeTruthy();
      // Built-in labels that aren't part of this taxonomy are gone.
      expect(queryByText("Analytics")).toBeNull();
      // The required category shows "Always Active" (no toggle); the one optional category gets
      // exactly one switch.
      expect(getByText("Always Active")).toBeTruthy();
      expect(document.querySelectorAll('[role="switch"]')).toHaveLength(1);
    });

    it("falls back to the id when a custom category has no label", async () => {
      await mountPreferences({
        mode: "cookie-only",
        regulation: "GDPR",
        categories: [{ id: "core", required: true }, { id: "extras" }],
      });
      expect(getByText("extras")).toBeTruthy();
    });
  });
});

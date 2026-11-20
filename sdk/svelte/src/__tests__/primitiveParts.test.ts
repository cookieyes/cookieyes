import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getCookieYes } from "../runtime.js";
import HandBanner from "./fixtures/HandBanner.svelte";
import HandOptOut from "./fixtures/HandOptOut.svelte";
import HandPreferences from "./fixtures/HandPreferences.svelte";
import {
  clearCookie,
  click,
  cookieOnly,
  getByText,
  mountWith,
  settle,
  unmountAll,
} from "./test-utils.js";

beforeEach(clearCookie);
afterEach(unmountAll);

describe("Banner parts, composed by hand", () => {
  it("renders our defaults, and the caller's children replace them", async () => {
    mountWith(cookieOnly("GDPR"), HandBanner, { variant: "full" });
    await settle();
    expect(document.querySelector('[data-cy-part="banner"] h2')?.textContent).toBe(
      "We value your privacy",
    );
    expect(document.querySelector('[data-cy-part="description"]')?.textContent).toContain(
      "cookies",
    );
    expect(document.getElementById("custom")?.textContent).toBe("Hello");
    expect(getByText("Accept All")).toBeTruthy();
    const link = document.querySelector<HTMLAnchorElement>('[data-cy-part="branding"]');
    expect(link?.textContent).toBe("Made by us");
    expect(link?.getAttribute("href")).toBe("https://www.cookieyes.com");
    expect(link?.getAttribute("rel")).toBe("noopener noreferrer");
  });

  it("uses the CCPA description under CCPA", async () => {
    mountWith(cookieOnly("CCPA"), HandBanner, { variant: "description" });
    await settle();
    expect(document.querySelector('[data-cy-part="description"]')?.textContent).toBe(
      getCookieYes().translations.ccpaDescription,
    );
  });

  it("lets the caller take the banner part off the root", async () => {
    mountWith(cookieOnly("GDPR"), HandBanner, { variant: "bare" });
    await settle();
    expect(document.getElementById("wrap")?.hasAttribute("data-cy-part")).toBe(false);
  });

  it("closes without a decision from a hand-built close button", async () => {
    mountWith(cookieOnly("GDPR"), HandBanner, { variant: "close" });
    await settle();
    await click(document.querySelector('[data-cy-part="close"]'));
    expect(getCookieYes().getSnapshot().isBannerDismissed).toBe(true);
    expect(getCookieYes().getSnapshot().hasActed).toBe(false);
  });
});

describe("Preferences parts, composed by hand", () => {
  it("hands each category to the snippets, with its state", async () => {
    const seen: string[] = [];
    mountWith(cookieOnly("GDPR"), HandPreferences, { seen });
    getCookieYes().manager.showPreferences();
    await settle();
    expect(seen).toContain("necessary:true:true");
    expect(seen).toContain("analytics:false:false");
    expect(getByText("More detail")).toBeTruthy();
    expect(document.querySelectorAll('[role="listitem"]')).toHaveLength(5);
    await click(document.getElementById("toggle-analytics"));
    expect(getCookieYes().getSnapshot().categories.analytics).toBe(true);
    // A required category cannot be toggled.
    await click(document.getElementById("toggle-necessary"));
    expect(getCookieYes().getSnapshot().categories.necessary).toBe(true);
  });

  it("renders Preferences.Description as a paragraph with the caller's text and no part attribute", async () => {
    mountWith(cookieOnly("GDPR"), HandPreferences, { seen: [] });
    getCookieYes().manager.showPreferences();
    await settle();
    const description = getByText("More detail", "p");
    expect(description.tagName).toBe("P");
    // Unlike the banner and opt-out parts, the React and Vue versions set no data-cy-part either.
    expect(description.hasAttribute("data-cy-part")).toBe(false);
  });
});

describe("OptOut parts, composed by hand", () => {
  it("renders the pieces and reaches the confirmation", async () => {
    mountWith(cookieOnly("CCPA"), HandOptOut);
    getCookieYes().showOptOut();
    await settle();
    expect(document.querySelector("label")?.textContent).toBe(
      "Do Not Sell or Share My Personal Information",
    );
    expect(document.querySelector("[role=status]")).toBeNull();
    await click(document.getElementById("box"));
    await click(getByText("Save My Preferences"));
    expect(document.querySelector("[role=status]")).not.toBeNull();
    expect(document.querySelector('[data-cy-part="confirm"]')).toBeNull();
  });
});

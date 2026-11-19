import { flushPromises } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { defineComponent, h } from "vue";
import { CookieBanner } from "../presets/CookieBanner.js";
import { CookiePreferences } from "../presets/CookiePreferences.js";
import { getCookieYes } from "../runtime.js";
import { clearCookie, click, cookieOnly, mountWith, unmountAll } from "./test-utils.js";

beforeEach(clearCookie);
afterEach(unmountAll);

// The banner is moved into the portal root, so query the document for it.
describe("styling: part labels", () => {
  it("labels the banner and its controls with data-cy-part", async () => {
    mountWith(cookieOnly("GDPR"), CookieBanner);
    await flushPromises();

    expect(document.querySelector('[data-cy-part="banner"]')).toBeTruthy();
    expect(document.querySelector('[data-cy-part="accept-all"]')).toBeTruthy();
    expect(document.querySelector('[data-cy-part="reject-all"]')).toBeTruthy();
    expect(document.querySelector('[data-cy-part="customise"]')).toBeTruthy();
  });

  it("labels each toggle with its on/off state", async () => {
    mountWith(cookieOnly("GDPR"), CookiePreferences);
    getCookieYes().manager.showPreferences();
    await flushPromises();

    const toggle = document.querySelector('[data-cy-part="toggle"]');
    expect(toggle).toBeTruthy();
    // A non-required category starts off for a fresh GDPR visitor.
    expect(toggle?.getAttribute("data-cy-state")).toBe("off");

    await click(toggle?.querySelector("input") ?? null);
    expect(document.querySelector('[data-cy-part="toggle"]')?.getAttribute("data-cy-state")).toBe(
      "on",
    );
  });
});

describe("styling: class and style passthrough", () => {
  it("merges a custom class onto the banner card without dropping defaults", async () => {
    mountWith(
      cookieOnly("GDPR"),
      defineComponent({ render: () => h(CookieBanner, { class: "my-banner" }) }),
    );
    await flushPromises();

    const card = document.querySelector('[data-cy-part="banner"]');
    expect(card?.classList.contains("cy-banner")).toBe(true);
    expect(card?.classList.contains("my-banner")).toBe(true);
  });

  it("applies a custom style to the banner card", async () => {
    mountWith(
      cookieOnly("GDPR"),
      defineComponent({ render: () => h(CookieBanner, { style: { zIndex: 42 } }) }),
    );
    await flushPromises();

    const card = document.querySelector<HTMLElement>('[data-cy-part="banner"]');
    expect(card?.style.zIndex).toBe("42");
  });

  it("writes no style attribute and no empty class when none was given", async () => {
    mountWith(cookieOnly("GDPR"), CookieBanner);
    await flushPromises();

    expect(document.querySelectorAll("[style]")).toHaveLength(0);
    expect(document.querySelectorAll('[class=""]')).toHaveLength(0);
  });
});

describe("styling: per-part classNames and styles", () => {
  it("merges classNames onto the named part, keeping our defaults", async () => {
    mountWith(
      cookieOnly("GDPR"),
      defineComponent({
        render: () => h(CookieBanner, { classNames: { acceptAll: "brand-accept" } }),
      }),
    );
    await flushPromises();

    const accept = document.querySelector('[data-cy-part="accept-all"]');
    expect(accept?.classList.contains("cy-btn")).toBe(true);
    expect(accept?.classList.contains("brand-accept")).toBe(true);
  });

  it("applies per-part inline styles", async () => {
    mountWith(
      cookieOnly("GDPR"),
      defineComponent({
        render: () => h(CookieBanner, { styles: { rejectAll: { color: "rgb(1, 2, 3)" } } }),
      }),
    );
    await flushPromises();

    const reject = document.querySelector<HTMLElement>('[data-cy-part="reject-all"]');
    expect(reject?.style.color).toBe("rgb(1, 2, 3)");
  });

  it("applies root classNames and styles to the card", async () => {
    mountWith(
      cookieOnly("GDPR"),
      defineComponent({
        render: () =>
          h(CookieBanner, {
            class: "mine",
            classNames: { root: "root-class" },
            style: { zIndex: 5 },
            styles: { root: { color: "rgb(4, 5, 6)" } },
          }),
      }),
    );
    await flushPromises();

    const card = document.querySelector<HTMLElement>('[data-cy-part="banner"]');
    expect(card?.className).toBe("cy-banner mine root-class");
    expect(card?.style.zIndex).toBe("5");
    expect(card?.style.color).toBe("rgb(4, 5, 6)");
  });

  it("styles the toggle part, which keeps its checked/unchecked state hook", async () => {
    mountWith(
      cookieOnly("GDPR"),
      defineComponent({
        render: () => h(CookiePreferences, { classNames: { toggle: "brand-toggle" } }),
      }),
    );
    getCookieYes().manager.showPreferences();
    await flushPromises();

    const toggle = document.querySelector('[data-cy-part="toggle"]');
    expect(toggle?.classList.contains("cy-toggle")).toBe(true);
    expect(toggle?.classList.contains("brand-toggle")).toBe(true);
    // The state hook the checked-toggle example relies on still works.
    expect(toggle?.getAttribute("data-cy-state")).toBe("off");
  });
});

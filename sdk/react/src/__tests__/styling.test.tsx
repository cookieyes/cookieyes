import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { CookieBanner } from "../presets/CookieBanner.js";
import { CookiePreferences } from "../presets/CookiePreferences.js";
import { clearCookie, mountCookieOnly, teardown } from "./test-utils.js";

beforeEach(clearCookie);
afterEach(() => {
  cleanup();
  teardown();
});

// The banner portals into document.body, so query the document for it.
describe("styling — part labels", () => {
  it("labels the banner and its controls with data-cy-part", () => {
    mountCookieOnly("GDPR");
    render(<CookieBanner />);

    expect(document.querySelector('[data-cy-part="banner"]')).toBeTruthy();
    expect(document.querySelector('[data-cy-part="accept-all"]')).toBeTruthy();
    expect(document.querySelector('[data-cy-part="reject-all"]')).toBeTruthy();
    expect(document.querySelector('[data-cy-part="customise"]')).toBeTruthy();
  });

  it("labels each toggle with its on/off state", () => {
    const rt = mountCookieOnly("GDPR");
    act(() => rt.manager.showPreferences());
    render(<CookiePreferences />);

    const toggle = document.querySelector('[data-cy-part="toggle"]');
    expect(toggle).toBeTruthy();
    // A non-required category starts off for a fresh GDPR visitor.
    expect(toggle?.getAttribute("data-cy-state")).toBe("off");

    const checkbox = toggle?.querySelector("input");
    if (checkbox) act(() => fireEvent.click(checkbox));
    expect(document.querySelector('[data-cy-part="toggle"]')?.getAttribute("data-cy-state")).toBe(
      "on",
    );
  });
});

describe("styling — className / style passthrough", () => {
  it("merges a custom className onto the banner card without dropping defaults", () => {
    mountCookieOnly("GDPR");
    render(<CookieBanner className="my-banner" />);

    const card = document.querySelector('[data-cy-part="banner"]');
    expect(card?.classList.contains("cy-banner")).toBe(true); // default kept
    expect(card?.classList.contains("my-banner")).toBe(true); // custom added
  });

  it("applies a custom style to the banner card", () => {
    mountCookieOnly("GDPR");
    render(<CookieBanner style={{ zIndex: 42 }} />);

    const card = document.querySelector<HTMLElement>('[data-cy-part="banner"]');
    expect(card?.style.zIndex).toBe("42");
  });
});

describe("styling — per-part classNames / styles", () => {
  it("merges classNames onto the named part, keeping our defaults", () => {
    mountCookieOnly("GDPR");
    render(<CookieBanner classNames={{ acceptAll: "brand-accept" }} />);

    const accept = document.querySelector('[data-cy-part="accept-all"]');
    expect(accept?.classList.contains("cy-btn")).toBe(true); // default kept
    expect(accept?.classList.contains("brand-accept")).toBe(true); // custom added
  });

  it("applies per-part inline styles", () => {
    mountCookieOnly("GDPR");
    render(<CookieBanner styles={{ rejectAll: { color: "rgb(1, 2, 3)" } }} />);

    const reject = document.querySelector<HTMLElement>('[data-cy-part="reject-all"]');
    expect(reject?.style.color).toBe("rgb(1, 2, 3)");
  });

  it("styles the toggle part, which keeps its checked/unchecked state hook", () => {
    const rt = mountCookieOnly("GDPR");
    act(() => rt.manager.showPreferences());
    render(<CookiePreferences classNames={{ toggle: "brand-toggle" }} />);

    const toggle = document.querySelector('[data-cy-part="toggle"]');
    expect(toggle?.classList.contains("cy-toggle")).toBe(true); // default kept
    expect(toggle?.classList.contains("brand-toggle")).toBe(true); // custom added
    // The state hook the checked-toggle example relies on still works.
    expect(toggle?.getAttribute("data-cy-state")).toBe("off");
  });
});

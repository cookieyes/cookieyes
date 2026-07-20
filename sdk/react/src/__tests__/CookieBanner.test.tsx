import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { CookieBanner } from "../presets/CookieBanner.js";
import { clearCookie, mountOffline, teardown } from "./test-utils.js";

beforeEach(clearCookie);
afterEach(() => {
  cleanup();
  teardown();
});

describe("CookieBanner — GDPR", () => {
  it("renders the title and the opt-in actions", () => {
    mountOffline("GDPR");
    render(<CookieBanner />);
    // The title also appears in a visually-hidden live-region announcer
    // (for screen readers on first appearance) — scope to the visible title.
    expect(
      screen.getByText("We value your privacy", { selector: ".cy-banner-title" }),
    ).toBeTruthy();
    expect(screen.getByText("Accept All")).toBeTruthy();
    expect(screen.getByText("Reject All")).toBeTruthy();
    expect(screen.getByText("Customise")).toBeTruthy();
  });

  it("hides itself after Accept All", () => {
    mountOffline("GDPR");
    render(<CookieBanner />);
    fireEvent.click(screen.getByText("Accept All"));
    expect(screen.queryByText("Accept All")).toBeNull();
  });

  it("grants nothing extra on Reject All but still dismisses", () => {
    const rt = mountOffline("GDPR");
    render(<CookieBanner />);
    fireEvent.click(screen.getByText("Reject All"));
    expect(rt.getSnapshot().hasActed).toBe(true);
    expect(rt.getSnapshot().categories.analytics).toBe(false);
  });

  it("opens the preferences dialog via Customise", () => {
    const rt = mountOffline("GDPR");
    render(<CookieBanner />);
    fireEvent.click(screen.getByText("Customise"));
    expect(rt.getSnapshot().isPreferencesOpen).toBe(true);
  });
});

describe("CookieBanner — DOM placement", () => {
  it("portals to the front of <body>, regardless of where it's rendered", () => {
    mountOffline("GDPR");
    // Render into a wrapper that's itself appended to <body>, simulating
    // <CookieYesRoot> mounting after the app's own content — the exact case
    // that made the banner unreachable without the portal.
    const appContent = document.createElement("div");
    appContent.id = "app-content-stand-in";
    document.body.appendChild(appContent);
    render(<CookieBanner />, { container: appContent });

    const portalRoot = document.getElementById("cookieyes-portal-root");
    expect(portalRoot).toBeTruthy();
    expect(document.body.firstElementChild).toBe(portalRoot);
    expect(portalRoot?.querySelector("[data-cky-banner]")).toBeTruthy();
    expect(appContent.querySelector("[data-cky-banner]")).toBeNull();

    document.body.removeChild(appContent);
  });
});

describe("CookieBanner — CCPA", () => {
  it("renders the Do Not Sell opt-out action", () => {
    mountOffline("CCPA");
    render(<CookieBanner />);
    expect(screen.getByText("Do Not Sell or Share My Personal Information")).toBeTruthy();
  });

  it("opens the opt-out dialog when Do Not Sell is clicked", () => {
    const rt = mountOffline("CCPA");
    render(<CookieBanner />);
    fireEvent.click(screen.getByText("Do Not Sell or Share My Personal Information"));
    expect(rt.getSnapshot().isOptOutOpen).toBe(true);
  });
});

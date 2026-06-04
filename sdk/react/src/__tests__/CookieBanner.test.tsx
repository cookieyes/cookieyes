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
    expect(screen.getByText("We value your privacy")).toBeTruthy();
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

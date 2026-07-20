import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { CookieBanner } from "../presets/CookieBanner.js";
import { getCookieYes, initCookieYes } from "../runtime.js";
import { clearCookie, teardown } from "./test-utils.js";

beforeEach(clearCookie);
afterEach(() => {
  cleanup();
  teardown();
});

describe("initCookieYes() — config-object setup", () => {
  it("wires up the banner from a single config object (GDPR)", () => {
    initCookieYes({ mode: "offline", regulation: "GDPR" });
    render(<CookieBanner />);
    expect(screen.getByText("We value your privacy")).toBeTruthy();
    expect(screen.getByText("Accept All")).toBeTruthy();
    expect(screen.getByText("Reject All")).toBeTruthy();
  });

  it("banner reflects consent state — hides after Accept All", () => {
    const rt = initCookieYes({ mode: "offline", regulation: "GDPR" });
    render(<CookieBanner />);
    expect(rt.getSnapshot().hasActed).toBe(false);

    fireEvent.click(screen.getByText("Accept All"));

    expect(rt.getSnapshot().hasActed).toBe(true);
    expect(Object.values(rt.getSnapshot().categories).every(Boolean)).toBe(true);
    expect(screen.queryByText("Accept All")).toBeNull();
  });

  it("registers the runtime that hooks/components resolve via getCookieYes()", () => {
    const rt = initCookieYes({ mode: "offline" });
    expect(getCookieYes()).toBe(rt);
  });

  it("maps the deprecated overrides.regulation to the top-level regulation", () => {
    const rt = initCookieYes({ mode: "offline", overrides: { regulation: "CCPA" } });
    expect(rt.getSnapshot().regulation).toBe("CCPA");
    render(<CookieBanner />);
    expect(screen.getByText("Do Not Sell or Share My Personal Information")).toBeTruthy();
  });

  it("accepts a self-hosted config with the canonical apiUrl key", () => {
    const rt = initCookieYes({
      mode: "self-hosted",
      apiUrl: "https://example.com/consent",
      regulation: "GDPR",
    });
    expect(rt.getSnapshot().regulation).toBe("GDPR");
    expect(getCookieYes()).toBe(rt);
  });
});

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { CookiePreferences } from "../presets/CookiePreferences.js";
import { createCookieYes } from "../runtime.js";
import { clearCookie, mountOffline, teardown } from "./test-utils.js";

beforeEach(clearCookie);
afterEach(() => {
  cleanup();
  teardown();
});

describe("CookiePreferences", () => {
  it("renders nothing while the dialog is closed", () => {
    mountOffline("GDPR");
    const { container } = render(<CookiePreferences />);
    expect(container.firstChild).toBeNull();
  });

  it("renders the dialog with category labels once opened", () => {
    const rt = mountOffline("GDPR");
    rt.manager.showPreferences();
    render(<CookiePreferences />);
    expect(screen.getByText("Customise Consent Preferences")).toBeTruthy();
    expect(screen.getByText("Necessary")).toBeTruthy();
    expect(screen.getByText("Analytics")).toBeTruthy();
    expect(screen.getByText("Save My Preferences")).toBeTruthy();
  });

  it("toggles a category and persists on Save", () => {
    const rt = mountOffline("GDPR");
    rt.manager.showPreferences();
    render(<CookiePreferences />);

    const firstSwitch = screen.getAllByRole("switch")[0];
    if (!firstSwitch) throw new Error("expected at least one category switch");
    fireEvent.click(firstSwitch);

    fireEvent.click(screen.getByText("Save My Preferences"));
    expect(rt.getSnapshot().isPreferencesOpen).toBe(false);
    expect(rt.getSnapshot().hasActed).toBe(true);
  });

  describe("configurable categories", () => {
    it("renders a custom taxonomy's labels instead of the built-in five", () => {
      const rt = createCookieYes()
        .mode("cookie-only")
        .regulation("GDPR")
        .categories([
          { id: "essential", required: true, label: "Strictly Essential" },
          { id: "marketing", label: "Marketing & Ads" },
        ])
        .mount();
      rt.manager.showPreferences();
      render(<CookiePreferences />);

      expect(screen.getByText("Strictly Essential")).toBeTruthy();
      expect(screen.getByText("Marketing & Ads")).toBeTruthy();
      // Built-in labels that aren't part of this taxonomy are gone.
      expect(screen.queryByText("Analytics")).toBeNull();
      // The required category shows "Always Active" (no toggle); the one
      // optional category gets exactly one switch.
      expect(screen.getByText("Always Active")).toBeTruthy();
      expect(screen.getAllByRole("switch")).toHaveLength(1);
    });

    it("falls back to the id when a custom category has no label", () => {
      const rt = createCookieYes()
        .mode("cookie-only")
        .regulation("GDPR")
        .categories([{ id: "core", required: true }, { id: "extras" }])
        .mount();
      rt.manager.showPreferences();
      render(<CookiePreferences />);
      expect(screen.getByText("extras")).toBeTruthy();
    });
  });
});

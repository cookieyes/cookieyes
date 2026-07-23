import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { GatedFrame } from "../controls/GatedFrame.js";
import { clearCookie, mountOffline, teardown } from "./test-utils.js";

const SRC = "https://www.youtube.com/embed/dQw4w9WgXcQ";

beforeEach(clearCookie);
afterEach(() => {
  cleanup();
  teardown();
});

describe("GatedFrame", () => {
  it("shows a placeholder while the category is denied", () => {
    mountOffline("GDPR"); // analytics denied
    const { container } = render(<GatedFrame src={SRC} category="analytics" />);
    expect(container.querySelector("iframe")).toBeNull();
    expect(screen.getByText("Manage Preferences")).toBeTruthy();
  });

  it("renders a custom placeholder when provided", () => {
    mountOffline("GDPR");
    render(
      <GatedFrame src={SRC} category="analytics" placeholder={<span>enable analytics</span>} />,
    );
    expect(screen.getByText("enable analytics")).toBeTruthy();
  });

  it("opens preferences from the default placeholder button", () => {
    const rt = mountOffline("GDPR");
    render(<GatedFrame src={SRC} category="analytics" />);
    fireEvent.click(screen.getByText("Manage Preferences"));
    expect(rt.getSnapshot().isPreferencesOpen).toBe(true);
  });

  it("renders the iframe once the category is consented (saved decision)", () => {
    const rt = mountOffline("GDPR");
    rt.manager.acceptAll();
    const { container } = render(<GatedFrame src={SRC} category="analytics" title="video" />);
    const iframe = container.querySelector("iframe");
    expect(iframe).not.toBeNull();
    expect(iframe?.getAttribute("src")).toBe(SRC);
  });

  it("does NOT render on a transient toggle — only on a saved decision", () => {
    const rt = mountOffline("GDPR");
    const { container } = render(<GatedFrame src={SRC} category="analytics" title="video" />);
    // Flipping the switch in the (unsaved) dialog must not load the embed.
    act(() => rt.manager.updateCategory("analytics", true));
    expect(container.querySelector("iframe")).toBeNull();
    // Saving commits it → now it loads.
    act(() => rt.manager.savePreferences());
    expect(container.querySelector("iframe")).not.toBeNull();
  });

  it("latches: stays rendered after the category is revoked (reload to re-block)", () => {
    const rt = mountOffline("GDPR");
    rt.manager.acceptAll();
    const { container } = render(<GatedFrame src={SRC} category="analytics" title="video" />);
    expect(container.querySelector("iframe")).not.toBeNull();
    // Revoke via a real action — the already-loaded frame must NOT swap back to
    // the placeholder mid-session.
    act(() => rt.manager.rejectAll());
    expect(container.querySelector("iframe")).not.toBeNull();
  });
});

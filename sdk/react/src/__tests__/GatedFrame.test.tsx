import { cleanup, fireEvent, render, screen } from "@testing-library/react";
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

  it("renders the iframe once the category is consented", () => {
    const rt = mountOffline("GDPR");
    rt.manager.updateCategory("analytics", true);
    const { container } = render(<GatedFrame src={SRC} category="analytics" title="video" />);
    const iframe = container.querySelector("iframe");
    expect(iframe).not.toBeNull();
    expect(iframe?.getAttribute("src")).toBe(SRC);
  });
});

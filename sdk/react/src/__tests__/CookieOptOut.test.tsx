import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { CookieOptOut } from "../presets/CookieOptOut.js";
import { clearCookie, mountOffline, teardown } from "./test-utils.js";

beforeEach(clearCookie);
afterEach(() => {
  cleanup();
  teardown();
});

describe("CookieOptOut", () => {
  it("renders nothing while the opt-out dialog is closed", () => {
    mountOffline("CCPA");
    const { container } = render(<CookieOptOut />);
    expect(container.firstChild).toBeNull();
  });

  it("renders the opt-out dialog with a toggle once opened", () => {
    const rt = mountOffline("CCPA");
    rt.showOptOut();
    render(<CookieOptOut />);
    expect(screen.getByText("Opt-out Preferences")).toBeTruthy();
    expect(screen.getByRole("checkbox")).toBeTruthy();
    expect(screen.getByText("Save My Preferences")).toBeTruthy();
  });

  it("records the opt-out when the checkbox is checked and saved", () => {
    const rt = mountOffline("CCPA");
    rt.showOptOut();
    render(<CookieOptOut />);

    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByText("Save My Preferences"));

    expect(rt.getSnapshot().hasActed).toBe(true);
  });

  it("closes straight away, with no success message, when saved without opting out", () => {
    const rt = mountOffline("CCPA");
    rt.showOptOut();
    render(<CookieOptOut />);
    fireEvent.click(screen.getByText("Save My Preferences"));

    expect(rt.getSnapshot().hasActed).toBe(true);
    expect(rt.getSnapshot().isOptOutOpen).toBe(false);
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("moves focus to the confirmation and tells screen readers it closes automatically", () => {
    const rt = mountOffline("CCPA");
    rt.showOptOut();
    render(<CookieOptOut />);
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByText("Save My Preferences"));

    const status = screen.getByRole("status");
    expect(document.activeElement).toBe(status);
    const spoken = within(status).getByText("Banner closes automatically in 10 seconds...");
    expect(spoken.closest("[aria-hidden]")).toBeNull();
    expect(
      status.querySelector(".cy-optout-countdown")?.closest('[aria-hidden="true"]'),
    ).toBeTruthy();
  });
});

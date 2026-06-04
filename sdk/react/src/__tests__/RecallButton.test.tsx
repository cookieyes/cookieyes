import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { RecallButton } from "../controls/RecallButton.js";
import { clearCookie, mountOffline, teardown } from "./test-utils.js";

beforeEach(clearCookie);
afterEach(() => {
  cleanup();
  teardown();
});

describe("RecallButton", () => {
  it("renders nothing while the banner is still visible", () => {
    mountOffline("GDPR");
    const { container } = render(<RecallButton />);
    expect(container.firstChild).toBeNull();
  });

  it("appears after the user has acted and reopens preferences (GDPR)", () => {
    const rt = mountOffline("GDPR");
    render(<RecallButton />);

    act(() => {
      rt.manager.acceptAll();
    });

    const button = screen.getByLabelText("Consent Preferences");
    expect(button).toBeTruthy();

    fireEvent.click(button);
    expect(rt.getSnapshot().isPreferencesOpen).toBe(true);
  });
});

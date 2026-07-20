import { _clearStopHandlers } from "@cookieyes/core";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ReloadNotice } from "../presets/ReloadNotice.js";
import { createCookieYes } from "../runtime.js";
import { clearCookie, teardown } from "./test-utils.js";

beforeEach(() => {
  clearCookie();
  _clearStopHandlers();
});
afterEach(() => {
  cleanup();
  teardown();
  _clearStopHandlers();
});

/** Mounts a runtime whose only integration (hotjar) is reload-only. */
function mountWithReloadOnlyIntegration() {
  return createCookieYes()
    .mode("cookie-only")
    .regulation("GDPR")
    .integrations([{ vendor: "hotjar" }])
    .mount();
}

describe("ReloadNotice", () => {
  it("renders nothing until a reload-only tool's category is revoked", () => {
    mountWithReloadOnlyIntegration();
    const { container } = render(<ReloadNotice />);
    expect(container.firstChild).toBeNull();
  });

  it("appears (as role=alert) after revoking, with a reload and dismiss button", () => {
    const rt = mountWithReloadOnlyIntegration();
    render(<ReloadNotice />);

    act(() => {
      rt.manager.acceptAll();
      rt.manager.rejectAll();
    });

    expect(screen.getByRole("alert")).toBeTruthy();
    expect(screen.getByText("Reload page")).toBeTruthy();
    expect(screen.getByText("Dismiss")).toBeTruthy();
  });

  it("dismiss hides the notice and it does not reappear on a no-op save", () => {
    const rt = mountWithReloadOnlyIntegration();
    render(<ReloadNotice />);

    act(() => {
      rt.manager.acceptAll();
      rt.manager.rejectAll();
    });
    expect(screen.queryByRole("alert")).not.toBeNull();

    act(() => {
      fireEvent.click(screen.getByText("Dismiss"));
    });
    expect(screen.queryByRole("alert")).toBeNull();

    act(() => {
      rt.manager.savePreferences();
    });
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("the reload button calls window.location.reload", () => {
    const reloadSpy = vi.fn();
    const original = window.location;
    // biome-ignore lint/performance/noDelete: jsdom location is non-configurable otherwise
    delete (window as unknown as { location?: Location }).location;
    (window as unknown as { location: unknown }).location = { ...original, reload: reloadSpy };

    const rt = mountWithReloadOnlyIntegration();
    render(<ReloadNotice />);
    act(() => {
      rt.manager.acceptAll();
      rt.manager.rejectAll();
    });

    act(() => {
      fireEvent.click(screen.getByText("Reload page"));
    });
    expect(reloadSpy).toHaveBeenCalledOnce();

    (window as unknown as { location: Location }).location = original;
  });
});

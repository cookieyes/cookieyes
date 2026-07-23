import type { ConsentEventPayload } from "@cookieyes/core";
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useOnConsentChange } from "../hooks/useOnConsentChange.js";
import { clearCookie, mountOffline, teardown } from "./test-utils.js";

beforeEach(clearCookie);
afterEach(() => {
  cleanup();
  teardown();
});

describe("useOnConsentChange", () => {
  it("fires once on mount with the current state (isInitial)", () => {
    mountOffline("GDPR");
    const fn = vi.fn();
    renderHook(() => useOnConsentChange("change", fn));

    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn.mock.calls[0]?.[0]).toMatchObject({ isInitial: true, changedCategories: [] });
  });

  it('"change" fires with changedCategories when the visitor acts', () => {
    const rt = mountOffline("GDPR");
    const fn = vi.fn<(p: ConsentEventPayload) => void>();
    renderHook(() => useOnConsentChange("change", fn));

    act(() => rt.manager.acceptAll());

    expect(fn).toHaveBeenCalledTimes(2); // initial replay + the change
    const last = fn.mock.calls[1]?.[0];
    expect(last?.isInitial).toBe(false);
    expect(last?.changedCategories).toContain("analytics");
  });

  it('"save" fires on a re-confirm even when nothing changed; "change" does not', () => {
    const rt = mountOffline("GDPR");
    const save = vi.fn();
    const change = vi.fn();
    renderHook(() => useOnConsentChange("save", save));
    renderHook(() => useOnConsentChange("change", change));

    act(() => rt.manager.acceptAll()); // real change
    act(() => rt.manager.acceptAll()); // unchanged re-confirm

    expect(save).toHaveBeenCalledTimes(3); // replay + 2 saves
    expect(change).toHaveBeenCalledTimes(2); // replay + 1 real change
  });

  it("only fires for the named category when scoped", () => {
    const rt = mountOffline("GDPR");
    const fn = vi.fn();
    renderHook(() => useOnConsentChange("change", fn, { category: "advertisement" }));

    act(() => rt.manager.acceptSelected(["analytics"])); // advertisement unchanged
    expect(fn).toHaveBeenCalledTimes(1); // only the initial replay

    act(() => rt.manager.acceptAll()); // advertisement now granted
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("stops firing after unmount", () => {
    const rt = mountOffline("GDPR");
    const fn = vi.fn();
    const { unmount } = renderHook(() => useOnConsentChange("save", fn));
    unmount();

    act(() => rt.manager.acceptAll());
    expect(fn).toHaveBeenCalledTimes(1); // only the initial replay, none after unmount
  });

  it("is a no-op when no runtime is mounted (SSR-safe)", () => {
    const fn = vi.fn();
    expect(() => renderHook(() => useOnConsentChange("change", fn))).not.toThrow();
    expect(fn).not.toHaveBeenCalled();
  });
});

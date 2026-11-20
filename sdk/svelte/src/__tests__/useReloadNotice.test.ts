import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useReloadNotice } from "../hooks/useReloadNotice.svelte.js";
import { getCookieYes } from "../runtime.js";
import { clearCookie, renderHook, unmountAll } from "./test-utils.js";

beforeEach(clearCookie);
afterEach(unmountAll);

describe("useReloadNotice", () => {
  it("is not required by default", () => {
    const { result } = renderHook(() => useReloadNotice(), { mode: "cookie-only" });
    expect(result.required).toBe(false);
    expect(result.reasons).toEqual([]);
  });

  it("shows after a stop handler throws on revoke, and dismiss clears it", () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const { result } = renderHook(() => useReloadNotice(), {
      mode: "cookie-only",
      regulation: "GDPR",
      customStopHandlers: [
        {
          id: "legacy",
          category: "analytics",
          stop: () => {
            throw new Error("cannot stop");
          },
        },
      ],
    });
    const { manager } = getCookieYes();
    manager.acceptAll();
    manager.rejectAll();
    expect(result.required).toBe(true);
    expect(result.reasons).toEqual(["legacy"]);
    result.dismiss();
    expect(result.required).toBe(false);
  });
});

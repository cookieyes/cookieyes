import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useReloadNotice } from "../composables/useReloadNotice.js";
import { getCookieYes } from "../runtime.js";
import { clearCookie, cookieOnly, renderComposable, unmountAll } from "./test-utils.js";

beforeEach(clearCookie);
afterEach(unmountAll);

describe("useReloadNotice", () => {
  it("is not required by default", () => {
    const { result } = renderComposable(() => useReloadNotice(), cookieOnly());
    expect(result.required.value).toBe(false);
    expect(result.reasons.value).toEqual([]);
  });

  it("shows after a stop handler throws on revoke, and dismiss clears it", () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const { result } = renderComposable(() => useReloadNotice(), {
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
    expect(result.required.value).toBe(true);
    expect(result.reasons.value).toEqual(["legacy"]);
    result.dismiss();
    expect(result.required.value).toBe(false);
  });
});

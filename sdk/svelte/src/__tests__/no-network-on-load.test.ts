import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { _createRuntime } from "../runtime.js";
import { clearCookie, cookieOnly, mountWith, unmountAll } from "./test-utils.js";

describe("no network on load", () => {
  let fetchSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    clearCookie();
    fetchSpy = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchSpy);
  });

  afterEach(() => {
    unmountAll();
    vi.unstubAllGlobals();
  });

  it("cookie-only mode performs zero network requests on setup and mount", () => {
    mountWith(cookieOnly("GDPR"));
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("self-hosted mode performs zero requests on load, exactly one POST after Accept All", () => {
    const rt = _createRuntime({
      mode: "self-hosted",
      apiUrl: "https://backend.example.com/consent",
      regulation: "GDPR",
    });
    expect(fetchSpy).not.toHaveBeenCalled();
    rt.manager.acceptAll();
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://backend.example.com/consent");
    expect(init.method).toBe("POST");
  });

  it("self-hosted Reject All and Save each POST exactly once, never GET", () => {
    const rt = _createRuntime({
      mode: "self-hosted",
      apiUrl: "https://b.example/c",
      regulation: "GDPR",
    });
    rt.manager.rejectAll();
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    rt.manager.showPreferences();
    rt.manager.savePreferences();
    expect(fetchSpy).toHaveBeenCalledTimes(2);
    for (const call of fetchSpy.mock.calls) {
      expect((call[1] as RequestInit).method).toBe("POST");
    }
  });
});

import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CookieBanner } from "../presets/CookieBanner.js";
import { createCookieYes } from "../runtime.js";
import { clearCookie, mountOffline, teardown } from "./test-utils.js";

/**
 * FIX 5 — no load-time network.
 * Offline mode must perform zero requests before any user interaction.
 * Self-hosted mode must not fetch on load — only POST consent on accept/reject/save.
 */
describe("no network on load", () => {
  let fetchSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    clearCookie();
    fetchSpy = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchSpy);
  });

  afterEach(() => {
    cleanup();
    teardown();
    vi.unstubAllGlobals();
  });

  it("offline mode performs zero network requests on mount + render", () => {
    mountOffline("GDPR");
    render(<CookieBanner />);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("self-hosted mode performs zero requests on load, exactly one POST after Accept All", () => {
    const rt = createCookieYes()
      .mode("self-hosted")
      .backendURL("https://backend.example.com/consent")
      .regulation("GDPR")
      .mount();
    render(<CookieBanner />);
    expect(fetchSpy).not.toHaveBeenCalled(); // nothing on load

    rt.manager.acceptAll();
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://backend.example.com/consent");
    expect(init.method).toBe("POST");
  });

  it("self-hosted Reject All and Save each POST exactly once; never GET", () => {
    const rt = createCookieYes()
      .mode("self-hosted")
      .backendURL("https://b.example/c")
      .regulation("GDPR")
      .mount();
    expect(fetchSpy).not.toHaveBeenCalled();

    rt.manager.rejectAll();
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    rt.manager.showPreferences();
    rt.manager.savePreferences();
    expect(fetchSpy).toHaveBeenCalledTimes(2);

    for (const call of fetchSpy.mock.calls) {
      const init = call[1] as RequestInit;
      expect(init.method).toBe("POST");
    }
  });
});

import { afterEach, describe, expect, it, vi } from "vitest";
import { createCollector, isThirdParty } from "../../scanner/collector.js";

afterEach(() => {
  document.head.innerHTML = "";
  document.body.innerHTML = "";
  document.cookie = "_hjSession_1=; max-age=0; path=/";
  vi.useRealTimers();
});

describe("isThirdParty", () => {
  it("compares sites, not exact hosts", () => {
    expect(isThirdParty(new URL("https://cdn.shop.example.com/a.js"), "www.example.com")).toBe(
      false,
    );
    expect(isThirdParty(new URL("https://static.hotjar.com/a.js"), "www.example.com")).toBe(true);
    expect(isThirdParty(new URL("https://a.example.co.uk/x"), "b.example.co.uk")).toBe(false);
    expect(isThirdParty(new URL("https://other.co.uk/x"), "b.example.co.uk")).toBe(true);
    expect(isThirdParty(new URL("data:text/plain,hi"), "example.com")).toBe(false);
  });
});

describe("createCollector", () => {
  it("records third-party scripts already on the page and ignores first-party ones", () => {
    document.head.innerHTML =
      '<script src="https://static.hotjar.com/c/hotjar-1.js?sv=6"></script><script src="/app.js"></script>';
    const c = createCollector({ onChange: () => undefined });
    c.start();
    c.stop();
    expect(c.list().map((o) => o.key)).toEqual(["script:https://static.hotjar.com/c/hotjar-1.js"]);
    expect(c.list()[0]?.url).toBe("https://static.hotjar.com/c/hotjar-1.js?sv=6");
  });

  it("notices iframes added after it started", async () => {
    const onChange = vi.fn();
    const c = createCollector({ onChange });
    c.start();
    const frame = document.createElement("iframe");
    frame.src = "https://player.vimeo.com/video/1";
    document.body.appendChild(frame);
    await vi.waitFor(() => expect(c.list().some((o) => o.kind === "iframe")).toBe(true));
    c.stop();
    expect(onChange).toHaveBeenCalled();
  });

  it("notices a held iframe inside a subtree added later", async () => {
    const c = createCollector({ onChange: () => undefined });
    c.start();
    const section = document.createElement("section");
    section.innerHTML =
      '<div><iframe data-cy-src="https://www.youtube.com/embed/z" data-cy-category="marketing"></iframe></div>';
    document.body.appendChild(section);
    await vi.waitFor(() =>
      expect(c.list().find((o) => o.kind === "iframe")).toMatchObject({ held: true }),
    );
    c.stop();
  });

  it("records a held blockIframes iframe, and restarts its clock when the SDK releases it", async () => {
    document.body.innerHTML =
      '<iframe data-cy-src="https://www.youtube.com/embed/x" data-cy-category="marketing"></iframe>';
    const c = createCollector({ onChange: () => undefined });
    c.start();
    const held = c.list()[0];
    expect(held).toMatchObject({ held: true, blockedIframeCategory: "marketing" });
    const firstSeen = held?.firstSeen ?? 0;
    await new Promise((r) => setTimeout(r, 5));
    document.querySelector("iframe")?.setAttribute("src", "https://www.youtube.com/embed/x");
    await vi.waitFor(() => expect(c.list()[0]?.held).toBe(false));
    expect(c.list()[0]?.firstSeen).toBeGreaterThan(firstSeen);
    c.stop();
  });

  it("tracks cookies appearing and being cleared", () => {
    const c = createCollector({ onChange: () => undefined });
    document.cookie = "_hjSession_1=abc; path=/";
    c.rescan();
    expect(c.list().find((o) => o.key === "cookie:_hjSession_1")?.present).toBe(true);
    document.cookie = "_hjSession_1=; max-age=0; path=/";
    c.rescan();
    expect(c.list().find((o) => o.key === "cookie:_hjSession_1")?.present).toBe(false);
  });

  it("reads the resource timeline: scripts by URL, other requests grouped by host", () => {
    const entries = [
      {
        name: "https://www.googletagmanager.com/gtag/js?id=G-1",
        initiatorType: "script",
        startTime: 10,
      },
      {
        name: "https://region1.google-analytics.com/g/collect?v=2",
        initiatorType: "beacon",
        startTime: 20,
      },
      {
        name: "https://region1.google-analytics.com/g/collect?v=2&x",
        initiatorType: "fetch",
        startTime: 5,
      },
      { name: `${location.origin}/api/me`, initiatorType: "fetch", startTime: 1 },
    ];
    const spy = vi
      .spyOn(performance, "getEntriesByType")
      .mockReturnValue(entries as unknown as PerformanceEntryList);
    const c = createCollector({ onChange: () => undefined });
    c.rescan();
    spy.mockRestore();
    const request = c.list().find((o) => o.kind === "request");
    expect(
      c
        .list()
        .map((o) => o.kind)
        .sort(),
    ).toEqual(["request", "script"]);
    expect(request).toMatchObject({ label: "region1.google-analytics.com/g", count: 2 });
    // On the Date.now() clock: page start plus the entry's startTime.
    expect(Math.abs((request?.firstSeen ?? 0) - (Date.now() - performance.now() + 5))).toBeLessThan(
      50,
    );
  });

  it("tracks localStorage keys", () => {
    window.localStorage.setItem("ajs_user_id", "1");
    const c = createCollector({ onChange: () => undefined });
    c.rescan();
    expect(c.list().find((o) => o.key === "storage:ajs_user_id")?.present).toBe(true);
    window.localStorage.removeItem("ajs_user_id");
    c.rescan();
    expect(c.list().find((o) => o.key === "storage:ajs_user_id")?.present).toBe(false);
  });

  it("start is idempotent and stop is safe to repeat", () => {
    const c = createCollector({ onChange: () => undefined });
    c.start();
    c.start();
    c.stop();
    c.stop();
    expect(c.list()).toEqual([]);
  });

  it("syncStores dates new cookies no later than the given time, and leaves known ones alone", () => {
    const c = createCollector({ onChange: () => undefined });
    document.cookie = "known=1; path=/";
    c.rescan();
    const knownSeen = c.list().find((o) => o.key === "cookie:known")?.firstSeen;
    document.cookie = "_hjSession_1=abc; path=/";
    c.syncStores(1000);
    expect(c.list().find((o) => o.key === "cookie:_hjSession_1")?.firstSeen).toBe(1000);
    expect(c.list().find((o) => o.key === "cookie:known")?.firstSeen).toBe(knownSeen);
    document.cookie = "known=; max-age=0; path=/";
  });

  it("times cookies exactly from cookieStore change events where the browser has them", async () => {
    const store = new EventTarget();
    (globalThis as { cookieStore?: EventTarget }).cookieStore = store;
    try {
      const c = createCollector({ onChange: () => undefined, pollInterval: 60_000 });
      c.start();
      const before = Date.now();
      store.dispatchEvent(
        Object.assign(new Event("change"), { changed: [{ name: "_fbp" }], deleted: [] }),
      );
      const seen = c.list().find((o) => o.key === "cookie:_fbp");
      expect(seen?.present).toBe(true);
      expect(seen?.firstSeen).toBeGreaterThanOrEqual(before);
      store.dispatchEvent(
        Object.assign(new Event("change"), { changed: [], deleted: [{ name: "_fbp" }] }),
      );
      expect(c.list().find((o) => o.key === "cookie:_fbp")?.present).toBe(false);
      c.stop();
      // Detached on stop: later events change nothing.
      store.dispatchEvent(
        Object.assign(new Event("change"), { changed: [{ name: "_late" }], deleted: [] }),
      );
      expect(c.list().some((o) => o.key === "cookie:_late")).toBe(false);
    } finally {
      delete (globalThis as { cookieStore?: EventTarget }).cookieStore;
    }
  });
});

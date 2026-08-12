import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createConsentManager } from "../manager.js";
import { _clearScriptRegistry } from "../scripts.js";
import { _clearStopHandlers, registerStopHandler } from "../stop-handlers.js";
import type { ConsentSnapshot } from "../types.js";

/**
 * The visible response to a click must not depend on the
 * side effects that follow it.
 *
 * Ordering here is not about latency (measured at ~11ms either way; a
 * synchronous reorder cannot make the browser paint sooner). It is about
 * failure isolation: gated-script injection and the Google Consent Mode
 * broadcast can both throw for reasons outside this SDK's control, and before
 * this change a throw in either meant subscribers were never notified — the
 * cookie recorded the decision but the banner never closed.
 */

const COOKIE = "cookieyes-consent";

function clearCookie() {
  document.cookie = `${COOKIE}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
}

beforeEach(() => {
  clearCookie();
  _clearScriptRegistry();
  _clearStopHandlers();
});

afterEach(() => {
  clearCookie();
  _clearScriptRegistry();
  _clearStopHandlers();
  vi.restoreAllMocks();
  // `dataLayer` is a shared global; reset it so one case can't leak a throwing
  // push into the next.
  (window as { dataLayer?: unknown[] | undefined }).dataLayer = undefined;
});

function manager() {
  return createConsentManager({ regulation: "GDPR" });
}

describe("persist(): the decision is committed and broadcast before side effects", () => {
  it("notifies subscribers before injecting gated scripts", () => {
    const order: string[] = [];
    const m = manager();
    m.registerScript({ id: "s1", src: "https://example.test/t.js", category: "analytics" });

    const appendSpy = vi.spyOn(document.head, "appendChild").mockImplementation(((
      node: unknown,
    ) => {
      order.push("inject");
      return node;
    }) as typeof document.head.appendChild);

    m.subscribe(() => order.push("notify"));
    m.acceptAll();

    expect(order[0]).toBe("notify");
    expect(order).toContain("inject");
    expect(appendSpy).toHaveBeenCalled();
  });

  it("writes the cookie before notifying, so a listener already sees the decision", () => {
    const m = manager();
    let cookieAtNotify = "";
    m.subscribe(() => {
      cookieAtNotify = document.cookie;
    });
    m.acceptAll();
    expect(cookieAtNotify).toContain(COOKIE);
  });

  it("passes an already-committed snapshot to subscribers", () => {
    const m = manager();
    let snap: ConsentSnapshot | undefined;
    m.subscribe((s) => {
      snap = s;
    });
    m.acceptAll();
    expect(snap?.hasActed).toBe(true);
    expect(snap?.categories.analytics).toBe(true);
  });

  it("fires onConsentUpdate synchronously within the call", () => {
    const onConsentUpdate = vi.fn();
    const m = createConsentManager({ regulation: "GDPR", onConsentUpdate });
    m.acceptAll();
    expect(onConsentUpdate).toHaveBeenCalledTimes(1);
  });
});

describe("persist(): a failing side effect cannot strand the banner", () => {
  it("still notifies when script injection throws", () => {
    const m = manager();
    m.registerScript({ id: "s1", src: "https://example.test/t.js", category: "analytics" });
    vi.spyOn(document.head, "appendChild").mockImplementation(() => {
      throw new Error("CSP blocked the script element");
    });

    const listener = vi.fn();
    m.subscribe(listener);

    expect(() => m.acceptAll()).not.toThrow();
    expect(listener).toHaveBeenCalled();
    expect(m.hasActed).toBe(true);
  });

  it("still notifies when dataLayer.push throws (the GTM-override case)", () => {
    // Faithful to what GTM does: `dataLayer` stays a real Array (the SDK gates
    // on `Array.isArray`) and only its `push` is replaced with GTM's own
    // function, which runs customer-authored templates. A broken one used to
    // leave the banner open. Using a plain object here would skip the broadcast
    // entirely and the test would pass without exercising anything.
    const dataLayer: unknown[] = [];
    dataLayer.push = () => {
      throw new Error("GTM template blew up");
    };
    (window as { dataLayer?: unknown[] }).dataLayer = dataLayer;

    const m = manager();
    const listener = vi.fn();
    m.subscribe(listener);

    expect(() => m.acceptAll()).not.toThrow();
    expect(listener).toHaveBeenCalled();
    expect(m.hasActed).toBe(true);
  });

  it("still notifies when a stop handler's registry walk throws", () => {
    const m = manager();
    registerStopHandler({
      id: "bad",
      category: "analytics",
      stop() {
        throw new Error("cannot stop");
      },
    });
    const listener = vi.fn();
    m.subscribe(listener);

    expect(() => m.rejectAll()).not.toThrow();
    expect(listener).toHaveBeenCalled();
  });

  it("a failing injection does not prevent the Google Consent Mode broadcast", () => {
    const pushed: unknown[] = [];
    const dataLayer: unknown[] = [];
    dataLayer.push = (...args: unknown[]) => pushed.push(...args);
    (window as { dataLayer?: unknown[] }).dataLayer = dataLayer;

    const m = manager();
    m.registerScript({ id: "s1", src: "https://example.test/t.js", category: "analytics" });
    vi.spyOn(document.head, "appendChild").mockImplementation(() => {
      throw new Error("boom");
    });

    m.acceptAll();
    expect(pushed.length).toBeGreaterThan(0);
  });
});

describe("createConsentManager(): a broken dataLayer cannot stop the SDK mounting", () => {
  it("does not throw out of createConsentManager when dataLayer.push throws", () => {
    // The load-time broadcast runs inside createConsentManager, so before this
    // was isolated an uncaught throw here propagated out of initCookieYes and
    // the SDK never mounted — no banner at all, from a third-party tag failure.
    const dataLayer: unknown[] = [];
    dataLayer.push = () => {
      throw new Error("GTM template blew up at load");
    };
    (window as { dataLayer?: unknown[] }).dataLayer = dataLayer;

    expect(() => manager()).not.toThrow();
  });

  it("the mounted manager still works after a load-time dataLayer failure", () => {
    const dataLayer: unknown[] = [];
    dataLayer.push = () => {
      throw new Error("GTM template blew up at load");
    };
    (window as { dataLayer?: unknown[] }).dataLayer = dataLayer;

    const m = manager();
    const listener = vi.fn();
    m.subscribe(listener);
    expect(() => m.acceptAll()).not.toThrow();
    expect(listener).toHaveBeenCalled();
    expect(m.hasActed).toBe(true);
  });
});

describe("persist(): the reload notice still reaches the UI", () => {
  it("emits a second notification when a tool needs a reload", () => {
    // A reload-only handler whose category is revoked can't be stopped cleanly,
    // so it lands in reloadRequiredBy — which is now computed after the first
    // notify() and therefore needs its own.
    const m = manager();
    m.acceptAll(); // grant everything so the tool becomes active
    registerStopHandler({ id: "legacy-tool", category: "analytics", needsReload: true });
    m.acceptAll(); // handler observes the granted state

    const snapshots: ConsentSnapshot[] = [];
    m.subscribe((s) => snapshots.push(s));
    m.rejectAll();

    expect(snapshots.length).toBeGreaterThanOrEqual(1);
    expect(m.reloadNotice.required).toBe(true);
    expect(m.reloadNotice.reasons).toContain("legacy-tool");
  });
});

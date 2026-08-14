import type { Cleanup, Integration } from "@cookieyes/core";

export type SegmentConfig = {
  /** Your Segment source write key. Public by design — safe in browser code. */
  writeKey: string;
  /** Consent category that gates it. Default `"analytics"`. */
  category?: string;
  /** Override the integration id (only needed if you run more than one). Default `"segment"`. */
  id?: string;
};

/**
 * Segment (analytics.js), consent-gated.
 *
 * Nothing loads until the category is granted; on withdrawal the script and
 * Segment's own identifiers are fully removed (`onRevoke: "remove"`). Send
 * events through `window.analytics` (`analytics.track(...)`, `.identify(...)`);
 * Segment's snippet queues calls until the real library has loaded, so a call
 * made right after consent isn't lost.
 *
 * `setup` resolves only when `analytics.min.js` has actually loaded (and rejects
 * if it fails), so the engine's status is truthful: `loading` → `active`, or
 * `error` (retried on the next consent change).
 *
 * Note: each re-grant starts a fresh Segment session, so Segment's snippet sends
 * a new page view — expected, not a double-count of your own tracked events.
 *
 * @example
 * initCookieYes({ mode: "cookie-only", integrations: [segment({ writeKey: "abc" })] });
 */
export function segment(config: SegmentConfig): Integration {
  return {
    id: config.id ?? "segment",
    category: config.category ?? "analytics",
    version: 1,
    load: "afterConsent",
    onRevoke: "remove",
    setup: () =>
      new Promise<Cleanup>((resolve, reject) => {
        const script = ensureSegment(config.writeKey);
        if (!script) {
          resolve(removeSegment); // no DOM (SSR) — nothing to wait for
          return;
        }
        if (script.dataset.ckyLoaded === "true") {
          resolve(removeSegment); // already loaded
          return;
        }
        script.addEventListener(
          "load",
          () => {
            script.dataset.ckyLoaded = "true";
            resolve(removeSegment);
          },
          { once: true },
        );
        script.addEventListener(
          "error",
          () => {
            script.remove(); // remove so a retry re-injects
            reject(new Error("Segment (analytics.min.js) failed to load"));
          },
          { once: true },
        );
      }),
  };
}

const CDN = "https://cdn.segment.com/analytics.js/v1";
const SCRIPT_ID = "cky-segment-analytics";
const METHODS = [
  "trackSubmit",
  "trackClick",
  "trackLink",
  "trackForm",
  "pageview",
  "identify",
  "reset",
  "group",
  "track",
  "ready",
  "alias",
  "debug",
  "page",
  "screen",
  "once",
  "off",
  "on",
  "addSourceMiddleware",
  "addIntegrationMiddleware",
  "setAnonymousId",
  "addDestinationMiddleware",
  "register",
] as const;

// Segment's analytics.js stub: an array that queues method calls until the real
// library loads and replays them. A faithful port of Segment's official snippet.
type AnalyticsStub = unknown[] & {
  invoked?: boolean;
  initialize?: unknown;
  methods?: readonly string[];
  factory?: (method: string) => (...args: unknown[]) => AnalyticsStub;
  load?: (key: string, options?: unknown) => void;
  _writeKey?: string;
  SNIPPET_VERSION?: string;
  [method: string]: unknown;
};

/**
 * Ensure the `window.analytics` stub exists (idempotent) and the real library
 * script is on the page, returning the `<script>` element (or `null` in SSR).
 * Re-injects the script if a prior load failed and removed it.
 */
function ensureSegment(writeKey: string): HTMLScriptElement | null {
  if (typeof window === "undefined" || typeof document === "undefined") return null;
  const w = window as Window & { analytics?: AnalyticsStub };
  const analytics: AnalyticsStub = w.analytics ?? ([] as unknown as AnalyticsStub);
  w.analytics = analytics;

  if (!analytics.invoked && !analytics.initialize) {
    analytics.invoked = true;
    analytics.methods = METHODS;
    analytics.factory =
      (method: string) =>
      (...args: unknown[]) => {
        analytics.push([method, ...args]);
        return analytics;
      };
    for (const method of METHODS) analytics[method] = analytics.factory(method);
    analytics.load = () => {}; // we inject the library ourselves, below
    analytics._writeKey = writeKey;
    analytics.SNIPPET_VERSION = "5.2.0";
    (analytics.page as () => void)(); // queue the initial page view
  }

  const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
  if (existing) return existing;
  const script = document.createElement("script");
  script.id = SCRIPT_ID;
  script.async = true;
  script.src = `${CDN}/${writeKey}/analytics.min.js`;
  document.head.appendChild(script);
  return script;
}

function removeSegment(): void {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  document.getElementById(SCRIPT_ID)?.remove();
  // Drop the queued stub so a re-grant starts clean and no queued call lingers.
  (window as Window & { analytics?: AnalyticsStub | undefined }).analytics = undefined;
  // Clear Segment's own identifiers so nothing keeps tracking after withdrawal.
  for (const name of ["ajs_anonymous_id", "ajs_user_id"]) {
    document.cookie = `${name}=; max-age=0; path=/`;
    try {
      window.localStorage?.removeItem(name);
    } catch {
      // localStorage can throw (private mode / disabled) — non-fatal.
    }
  }
}

import type { Integration, SilenceControl } from "@cookieyes/core";
import { deleteCookie } from "./cookies.js";
import { devTrackScript } from "./dev-queue.js";

/** Declared locally so the guard survives as a literal; see core's `deprecations.ts`. */
declare const process: { env: { NODE_ENV?: string } };

export type TikTokPixelConfig = {
  /** Your pixel id: the value in `ttq.load("…")` in the base code from TikTok Events Manager. */
  pixelId: string;
  /**
   * Send the first `ttq.page()` when the pixel loads. Default `true`; set `false`
   * and call {@link tiktokPage} yourself.
   */
  autoPageView?: boolean | undefined;
  /**
   * Count route changes in a single-page app as page views (the pixel's own
   * history observer). Default `true`; set `false` when you report page views
   * from your server through the Events API and would otherwise count them twice.
   */
  trackHistoryChanges?: boolean | undefined;
  /**
   * TikTok Limited Data Use (US privacy). Leave unset to turn it on for a US
   * opt-out visitor (CCPA); `true`/`false` forces it on/off.
   */
  limitedDataUse?: boolean | undefined;
  /** Consent category that gates it. Default `"advertisement"`. */
  category?: string | undefined;
  /** Override the integration id (only needed if you run more than one). Default `"tiktok-pixel"`. */
  id?: string | undefined;
};

/** TikTok's standard web events. Any other string is sent as a custom event. */
export type TikTokStandardEvent =
  | "ViewContent"
  | "ClickButton"
  | "Search"
  | "AddToWishlist"
  | "AddToCart"
  | "InitiateCheckout"
  | "AddPaymentInfo"
  | "CompletePayment"
  | "PlaceAnOrder"
  | "Contact"
  | "Download"
  | "SubmitForm"
  | "CompleteRegistration"
  | "Subscribe";

/** Parameters for {@link tiktokTrack}, in the pixel's own names. */
export type TikTokEventParams = {
  value?: number | undefined;
  currency?: string | undefined;
  [key: string]: unknown;
};

/** Options for {@link tiktokTrack}. */
export type TikTokTrackOptions = {
  /** Sent as `event_id`, so TikTok can de-duplicate against the same event sent from your server. */
  eventId?: string | undefined;
};

/**
 * Personal data for {@link tiktokIdentify}. Only pass values the visitor gave
 * you on this site, such as a logged-in user's email. The pixel hashes `email`
 * and `phoneNumber` with SHA-256 in the browser; `externalId` is sent as given.
 */
export type TikTokUser = {
  email?: string | undefined;
  phoneNumber?: string | undefined;
  externalId?: string | undefined;
};

/**
 * TikTok Pixel (`ttq`), consent-gated.
 *
 * Nothing loads until the category is granted (`load: "afterConsent"`): no
 * script, no `ttq` object, no cookie. On grant we queue TikTok's own consent
 * signal (`ttq.grantConsent()`) and the first page view, then load `events.js`.
 *
 * On withdrawal (`onRevoke: "silence"`) we call `ttq.revokeConsent()`, which
 * makes the pixel drop every later page view and event, then
 * `ttq.disableCookie()`, which also asks TikTok's server to delete its
 * third-party `_ttp` cookie, and delete the pixel's first-party cookies and
 * sessionStorage keys. No reload. A re-grant calls `ttq.grantConsent()` on the
 * same pixel, so tracking resumes without a second download.
 *
 * Send calls with {@link tiktokTrack}, {@link tiktokPage} and
 * {@link tiktokIdentify}: they do nothing before the pixel is on the page and
 * while consent is withdrawn, so nothing waits in TikTok's queue.
 *
 * @example
 * initCookieYes({ mode: "cookie-only", integrations: [tiktokPixel({ pixelId: "C1234567890ABCDEFGHI" })] });
 */
export function tiktokPixel(config: TikTokPixelConfig): Integration {
  const pixelId = config.pixelId.trim();
  return {
    id: config.id ?? "tiktok-pixel",
    category: config.category ?? "advertisement",
    version: 1,
    load: "afterConsent",
    onRevoke: "silence",
    setup: (ctx) =>
      new Promise<SilenceControl>((resolve, reject) => {
        const control: SilenceControl = { silence: () => silence(pixelId), resume };
        if (typeof window === "undefined" || typeof document === "undefined") {
          resolve(control);
          return;
        }
        if (!pixelId) {
          console.error(
            "[cookieyes] tiktokPixel: pixelId is empty, so the TikTok Pixel will not load.",
          );
          resolve(control);
          return;
        }
        const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
        if (existing?.dataset.ckyLoaded === "true") {
          // A restart with the pixel already on the page: the previous runner
          // silenced it on teardown, and setup only runs when consent is granted.
          resume();
          resolve(control);
          return;
        }
        const script =
          existing ??
          inject(pixelId, {
            autoPageView: config.autoPageView ?? true,
            trackHistoryChanges: config.trackHistoryChanges ?? true,
            // Limited Data Use: explicit config wins; otherwise on for a US opt-out (CCPA) visitor.
            limitedDataUse: config.limitedDataUse ?? ctx.region.regulation === "CCPA",
          });
        script.addEventListener(
          "load",
          () => {
            script.dataset.ckyLoaded = "true";
            resolve(control);
          },
          { once: true },
        );
        script.addEventListener(
          "error",
          () => {
            // Undo this attempt so a retry queues the consent signal and page view once, not twice.
            script.remove();
            delete (window as WindowWithTtq).ttq;
            reject(new Error("TikTok Pixel (events.js) failed to load"));
          },
          { once: true },
        );
      }),
  };
}

/**
 * Send a TikTok event, for example
 * `tiktokTrack("CompletePayment", { value: 10, currency: "USD" }, { eventId: "order-1" })`.
 * Does nothing before the visitor accepts or after a withdrawal; the call is
 * dropped, not sent later. A call made while the pixel is still loading is
 * kept by TikTok's own queue and sent once it has loaded.
 */
export function tiktokTrack(
  event: TikTokStandardEvent | (string & Record<never, never>),
  params: TikTokEventParams = {},
  options: TikTokTrackOptions = {},
): void {
  const ttq = live();
  if (!ttq) {
    warnDropped();
    return;
  }
  ttq.track(event, params, options.eventId ? { event_id: options.eventId } : {});
}

/** Send a page view yourself, for example with `autoPageView: false`. Same consent rules as {@link tiktokTrack}. */
export function tiktokPage(): void {
  const ttq = live();
  if (!ttq) {
    warnDropped();
    return;
  }
  ttq.page();
}

/**
 * Pass a logged-in visitor's details to TikTok for ad matching
 * (`ttq.identify`). Same consent rules as {@link tiktokTrack}. These values are
 * personal data: see {@link TikTokUser}.
 */
export function tiktokIdentify(user: TikTokUser): void {
  const ttq = live();
  if (!ttq) {
    warnDropped();
    return;
  }
  const values: Record<string, string> = {};
  if (user.email) values.email = user.email;
  if (user.phoneNumber) values.phone_number = user.phoneNumber;
  if (user.externalId) values.external_id = user.externalId;
  ttq.identify(values);
}

const SCRIPT_ID = "cky-tiktok-pixel";
const EVENTS_JS = "https://analytics.tiktok.com/i18n/pixel/events.js";
/** The methods TikTok's base code defers onto the queue until the pixel has loaded. */
const METHODS = [
  "page",
  "track",
  "identify",
  "instances",
  "debug",
  "on",
  "off",
  "once",
  "ready",
  "alias",
  "group",
  "enableCookie",
  "disableCookie",
  "holdConsent",
  "revokeConsent",
  "grantConsent",
];
/** The pixel's first-party cookies, besides `ttcsid_<pixelId>`. */
const COOKIES = ["_ttp", "_tt_enable_cookie", "ttcsid", "ttclid"];
/** The pixel's sessionStorage keys, including the queue it keeps while consent is held. */
const STORAGE_KEYS = [
  "tt_sessionId",
  "tt_pixel_session_index",
  "tt_appInfo",
  "tt_adInfo",
  "tt_hold_events",
];

type TtqMethod = (...args: unknown[]) => void;
/**
 * TikTok's `ttq`: an array that carries the pixel's methods. Before the script
 * loads they push `[method, ...args]` onto the array; the script then replaces
 * them and runs what was queued.
 */
type Ttq = unknown[] & {
  page: TtqMethod;
  track: TtqMethod;
  identify: TtqMethod;
  grantConsent: TtqMethod;
  revokeConsent: TtqMethod;
  disableCookie: TtqMethod;
  methods?: string[] | undefined;
  setAndDefer?: ((target: unknown[], method: string) => void) | undefined;
  instance?: ((pixelId: string) => unknown[]) | undefined;
  _i?: Record<string, unknown[] & { _u?: string | undefined }> | undefined;
  _t?: Record<string, number> | undefined;
  _o?: Record<string, Record<string, unknown>> | undefined;
};
type WindowWithTtq = Window &
  typeof globalThis & { ttq?: Ttq | undefined; TiktokAnalyticsObject?: string | undefined };

/** The `ttq` queue, a faithful port of TikTok's base code minus `load`, which {@link inject} does. */
function createStub(): Ttq {
  const ttq = [] as unknown as Ttq;
  ttq.methods = METHODS;
  ttq.setAndDefer = (target, method) => {
    (target as unknown as Record<string, TtqMethod>)[method] = (...args) => {
      target.push([method, ...args]);
    };
  };
  for (const method of METHODS) ttq.setAndDefer(ttq, method);
  ttq.instance = (pixelId) => {
    const instance = ttq._i?.[pixelId] ?? [];
    for (const method of METHODS) ttq.setAndDefer?.(instance, method);
    return instance;
  };
  return ttq;
}

/**
 * Create `ttq`, register the pixel the way `ttq.load` in TikTok's base code
 * does, queue the consent signal and the first page view, and add `events.js`
 * with our own `<script>` tag so the load can be awaited.
 */
function inject(
  pixelId: string,
  opts: { autoPageView: boolean; trackHistoryChanges: boolean; limitedDataUse: boolean },
): HTMLScriptElement {
  const w = window as WindowWithTtq;
  w.TiktokAnalyticsObject = "ttq";
  const ttq = (w.ttq ??= createStub());
  silenced = false;

  const options: Record<string, unknown> = {};
  if (opts.limitedDataUse) options.limited_data_use = true;
  if (!opts.trackHistoryChanges) options.historyObserver = false;
  const entry = [] as unknown[] & { _u?: string | undefined };
  entry._u = EVENTS_JS;
  (ttq._i ??= {})[pixelId] = entry;
  (ttq._t ??= {})[pixelId] = Date.now();
  (ttq._o ??= {})[pixelId] = options;
  // Consent first, so the first page view is reported as consented.
  ttq.grantConsent();
  if (opts.autoPageView) ttq.page();

  const script = document.createElement("script");
  script.id = SCRIPT_ID;
  script.async = true;
  script.src = `${EVENTS_JS}?sdkid=${encodeURIComponent(pixelId)}&lib=ttq`;
  devTrackScript(script);
  document.head.appendChild(script);
  return script;
}

/** Set while consent is withdrawn, so the helpers drop calls instead of waking the pixel. */
let silenced = false;

/**
 * Withdrawal: TikTok's own switches first, then cleanup. `revokeConsent` makes
 * the pixel drop every later request (it sends one last request of its own to
 * record the withdrawal); `disableCookie` also has TikTok's server expire its
 * third-party `_ttp`. Neither deletes the first-party cookies, so we do. The
 * pixel can still write a fresh `ttcsid` on a route change while silenced;
 * nothing is sent with it (checked in November 2026, see
 * contributing/design/vendor-runtime-behaviour.md).
 */
function silence(pixelId: string): void {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  silenced = true;
  const ttq = (window as WindowWithTtq).ttq;
  ttq?.revokeConsent();
  ttq?.disableCookie();
  for (const name of [...COOKIES, `ttcsid_${pixelId}`]) deleteCookie(name);
  try {
    for (const key of STORAGE_KEYS) sessionStorage.removeItem(key);
  } catch {
    // Storage can throw (private mode / disabled): non-fatal.
  }
}

/** Re-grant: tell the pixel it may track again. Its cookies come back on the next page load. */
function resume(): void {
  if (typeof window === "undefined") return;
  silenced = false;
  (window as WindowWithTtq).ttq?.grantConsent();
}

/** The queue or the loaded pixel, unless it is not on the page or consent is withdrawn. */
function live(): Ttq | undefined {
  if (typeof window === "undefined" || silenced) return undefined;
  return (window as WindowWithTtq).ttq;
}

let warned = false;
/** Dev-only, once per page: a helper call went nowhere. */
function warnDropped(): void {
  if (process.env.NODE_ENV !== "production" && !warned) {
    warned = true;
    console.warn(
      "[cookieyes] TikTok Pixel call dropped: the visitor has not granted its category, or " +
        "has withdrawn it. Calls outside consent are not queued.",
    );
  }
}

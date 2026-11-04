import type { Integration, SilenceControl } from "@cookieyes/core";
import { deleteCookie } from "./cookies.js";
import { devTrackScript } from "./dev-queue.js";

export type MatomoAnalyticsConfig = {
  /** Your Matomo address, e.g. `https://example.matomo.cloud` (the `u` value in Matomo's snippet). */
  matomoUrl: string;
  /** Your Matomo site id (the `setSiteId` value in Matomo's snippet). */
  siteId: number;
  /**
   * What Matomo does before the visitor decides. Default `"consent"`.
   * - `"consent"`: nothing loads until the category is granted. On withdrawal Matomo
   *   stops sending and its `_pk_*` cookies are deleted.
   * - `"cookieless-first"`: Matomo loads for every visitor and tracks without cookies.
   *   The category only controls cookies: a grant allows them, a withdrawal deletes
   *   them. Cookie-free tracking still sends the visitor's IP address and browser
   *   details, so whether it needs consent is your legal decision.
   */
  consentMode?: "consent" | "cookieless-first" | undefined;
  /** Load Matomo's tracker from this URL instead of `<matomoUrl>/matomo.js`. */
  scriptUrl?: string | undefined;
  /** Send tracking requests to this URL instead of `<matomoUrl>/matomo.php`. */
  trackerUrl?: string | undefined;
  /** Consent category that gates it. Default `"analytics"`. */
  category?: string | undefined;
  /** Override the integration id (only needed if you run more than one). Default `"matomo"`. */
  id?: string | undefined;
};

/**
 * Matomo (web analytics), consent-gated, in one of Matomo's two consent models.
 *
 * `"consent"` (default): nothing loads until the category is granted
 * (`load: "afterConsent"`). On withdrawal (`onRevoke: "silence"`) we push
 * `requireConsent` and `deleteCookies`: Matomo stops sending at once and its
 * `_pk_*` cookies go, with no reload. A re-grant resumes on the same page.
 *
 * `"cookieless-first"`: Matomo loads for everyone with `requireCookieConsent`
 * (`load: "immediately"`), so it counts visits without cookies. A grant pushes
 * `setCookieConsentGiven`, a withdrawal `forgetCookieConsentGiven`, which deletes
 * the cookies; tracking carries on cookie-free.
 *
 * Both follow Matomo's "Tracking & Cookie Consent" guide for a consent tool that
 * remembers the choice itself. Send calls with {@link matomoEvent} and
 * {@link matomoPageView}; they do nothing until Matomo is loaded.
 *
 * @example
 * initCookieYes({
 *   mode: "cookie-only",
 *   integrations: [matomoAnalytics({ matomoUrl: "https://example.matomo.cloud", siteId: 1 })],
 * });
 */
export function matomoAnalytics(config: MatomoAnalyticsConfig): Integration {
  const cookieless = config.consentMode === "cookieless-first";
  const control: SilenceControl = cookieless
    ? {
        silence: () => push(["forgetCookieConsentGiven"]),
        resume: () => push(["setCookieConsentGiven"]),
      }
    : { silence: stopTracking, resume: resumeTracking };
  return {
    id: config.id ?? "matomo",
    category: config.category ?? "analytics",
    version: 1,
    load: cookieless ? "immediately" : "afterConsent",
    onRevoke: "silence",
    setup: (ctx) =>
      new Promise<SilenceControl>((resolve, reject) => {
        if (typeof window === "undefined" || typeof document === "undefined") {
          resolve(control);
          return;
        }
        const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
        if (existing?.dataset.ckyLoaded === "true") {
          // A restart with the tracker already on the page: the previous runner
          // silenced it on teardown, so tell it where consent stands now.
          if (ctx.granted()) control.resume();
          resolve(control);
          return;
        }
        const script = existing ?? inject(config, cookieless && !ctx.granted());
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
            // Undo this attempt so a retry pushes the setup commands once, not twice.
            script.remove();
            const paq = (window as WindowWithPaq)._paq;
            if (paq) paq.length = 0;
            reject(new Error("Matomo failed to load"));
          },
          { once: true },
        );
      }),
  };
}

/**
 * Send a Matomo event. Does nothing until Matomo is loaded; in `"consent"` mode
 * that is until the visitor accepts.
 */
export function matomoEvent(category: string, action: string, name?: string, value?: number): void {
  push(["trackEvent", category, action, name, value]);
}

/**
 * Count a page view, by default for the current URL and title. Matomo counts the
 * first page by itself; call this on every route change in a single-page app.
 * Does nothing until Matomo is loaded.
 */
export function matomoPageView(url?: string, title?: string): void {
  if (typeof window === "undefined") return;
  push(
    ["setCustomUrl", url ?? window.location.href],
    ["setDocumentTitle", title ?? document.title],
    ["trackPageView"],
  );
}

const SCRIPT_ID = "cky-matomo";

/** Matomo's own consent memory, written by `rememberConsentGiven` and its siblings. */
const MATOMO_CONSENT_COOKIES = ["mtm_consent", "mtm_consent_removed", "mtm_cookie_consent"];

type WindowWithPaq = Window & typeof globalThis & { _paq?: unknown[] | undefined };

function push(...commands: unknown[][]): void {
  const paq = typeof window !== "undefined" ? (window as WindowWithPaq)._paq : undefined;
  if (paq) for (const command of commands) paq.push(command);
}

/**
 * Create `_paq` with Matomo's standard tracking code and add the tracker script.
 * `requireCookieConsent` goes first, so the queued page view sets no cookie.
 */
function inject(config: MatomoAnalyticsConfig, cookieFree: boolean): HTMLScriptElement {
  // A visitor may still carry Matomo's own consent cookies from an earlier setup
  // (`rememberConsentGiven`, as in Matomo's CookieYes guide). The tracker reads
  // them before every request: `mtm_consent` keeps tracking on after a withdrawal,
  // `mtm_consent_removed` keeps it off after a grant, `mtm_cookie_consent` allows
  // cookies before consent. CookieYes is the only record of consent, so clear them.
  for (const name of MATOMO_CONSENT_COOKIES) deleteCookie(name);

  const w = window as WindowWithPaq;
  const base = config.matomoUrl.replace(/\/$/, "");
  w._paq ??= [];
  if (cookieFree) push(["requireCookieConsent"]);
  push(
    ["setTrackerUrl", config.trackerUrl ?? `${base}/matomo.php`],
    ["setSiteId", config.siteId],
    ["enableLinkTracking"],
    ["trackPageView"],
  );

  const script = document.createElement("script");
  script.id = SCRIPT_ID;
  script.async = true;
  script.src = config.scriptUrl ?? `${base}/matomo.js`;
  devTrackScript(script);
  document.head.appendChild(script);
  return script;
}

/**
 * Withdrawal in `"consent"` mode. `forgetConsentGiven` would also stop and delete,
 * but it writes a 30-year `mtm_consent_removed` cookie; CookieYes already remembers.
 */
function stopTracking(): void {
  push(["requireConsent"], ["deleteCookies"]);
}

/**
 * Re-grant in `"consent"` mode. Matomo keeps the requests made while consent was
 * withdrawn in memory and `setConsentGiven` sends them all; `trackPageView` first
 * empties that queue, so only a fresh page view goes out (checked in matomo.js in
 * November 2026, see contributing/design/vendor-runtime-behaviour.md).
 */
function resumeTracking(): void {
  push(["trackPageView"], ["setConsentGiven"]);
}

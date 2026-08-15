import type { Integration } from "@cookieyes/core";

/**
 * Google Consent Mode + tag loaders (GA4, Google Ads, GTM).
 *
 * Google is different from a normal gated script. Every Google tag shares one
 * `window.dataLayer`, and Consent Mode needs a **deny-by-default** set *before*
 * any tag runs and before `initCookieYes` — so the SDK's own broadcast of the
 * visitor's saved choice lands on top of a clean default (a returning visitor
 * isn't stuck denied). That default belongs in the page `<head>`
 * ({@link googleConsentModeSnippet} / `@cookieyes/nextjs`); the loaders below
 * just add the library and register each product.
 */

type GoogleSignal =
  | "ad_storage"
  | "ad_user_data"
  | "ad_personalization"
  | "analytics_storage"
  | "functionality_storage"
  | "personalization_storage"
  | "security_storage";

export type ConsentModeOptions = {
  /** Override the pre-consent value per signal. Default: everything `"denied"` except `security_storage`. */
  defaults?: Partial<Record<GoogleSignal, "granted" | "denied">>;
  /** Milliseconds Google waits for a consent update before applying the default. Default `500`. */
  waitForUpdate?: number;
};

const DENY_ALL: Record<GoogleSignal, "granted" | "denied"> = {
  ad_storage: "denied",
  ad_user_data: "denied",
  ad_personalization: "denied",
  analytics_storage: "denied",
  functionality_storage: "denied",
  personalization_storage: "denied",
  security_storage: "granted", // strictly necessary, never gated on consent
};

function buildDefault(options?: ConsentModeOptions): Record<string, unknown> {
  return {
    ...DENY_ALL,
    ...options?.defaults,
    wait_for_update: options?.waitForUpdate ?? 500,
  };
}

type WindowWithGtag = Window &
  typeof globalThis & {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    __ckyGcmReady?: boolean;
  };

/**
 * The Consent Mode **default** snippet as inline JavaScript for the page
 * `<head>`. It must run before any Google tag and before `initCookieYes`. Render
 * it inline in `<head>` (see `@cookieyes/nextjs`), or, in a client-only app,
 * call {@link bootstrapGoogleConsentMode} before `initCookieYes`.
 *
 * @example
 * <script dangerouslySetInnerHTML={{ __html: googleConsentModeSnippet() }} />
 */
export function googleConsentModeSnippet(options?: ConsentModeOptions): string {
  const dflt = JSON.stringify(buildDefault(options));
  return (
    "window.dataLayer=window.dataLayer||[];" +
    "function gtag(){dataLayer.push(arguments);}" +
    "gtag('js',new Date());" +
    `gtag('consent','default',${dflt});`
  );
}

/**
 * Runtime equivalent of {@link googleConsentModeSnippet} for client-only apps:
 * sets up `dataLayer` + `gtag` and pushes the deny-by-default. Call it once,
 * **before** `initCookieYes`. Idempotent. (In Next.js prefer the server-rendered
 * head snippet for true first-paint.)
 */
export function bootstrapGoogleConsentMode(options?: ConsentModeOptions): void {
  if (typeof window === "undefined") return;
  const w = window as WindowWithGtag;
  if (w.__ckyGcmReady) return;
  w.__ckyGcmReady = true;
  const dataLayer = (w.dataLayer = w.dataLayer ?? []);
  if (!w.gtag) {
    w.gtag = function gtag() {
      // biome-ignore lint/complexity/noArguments: gtag's wire format IS the arguments object.
      dataLayer.push(arguments);
    };
  }
  w.gtag("js", new Date());
  w.gtag("consent", "default", buildDefault(options));
}

const GTAG_SRC = "https://www.googletagmanager.com/gtag/js";
const GTAG_SCRIPT_ID = "cky-google-gtag";

function warn(message: string): void {
  if (typeof console !== "undefined") console.warn(`[cookieyes] ${message}`);
}

/** Ensure the shared `gtag.js` library is on the page (injected once). */
function ensureGtagLibrary(firstId: string): HTMLScriptElement | null {
  if (typeof window === "undefined" || typeof document === "undefined") return null;
  const w = window as WindowWithGtag;
  if (!w.__ckyGcmReady) {
    warn(
      "Google Consent Mode default was not set before init — add the <head> snippet " +
        "(googleConsentModeSnippet / @cookieyes/nextjs) for correct first-paint behaviour. " +
        "Falling back to a deny-by-default now.",
    );
    bootstrapGoogleConsentMode();
  }
  const existing = document.getElementById(GTAG_SCRIPT_ID) as HTMLScriptElement | null;
  if (existing) return existing;
  const script = document.createElement("script");
  script.id = GTAG_SCRIPT_ID;
  script.async = true;
  script.src = `${GTAG_SRC}?id=${encodeURIComponent(firstId)}`;
  document.head.appendChild(script);
  return script;
}

/** Register one Google product on the shared gtag (idempotent per id). */
function configureGtag(id: string): void {
  (window as WindowWithGtag).gtag?.("config", id);
}

/** Shared loader for the gtag-based products (GA4, Google Ads). */
function gtagIntegration(targetId: string, base: { id: string; category: string }): Integration {
  return {
    ...base,
    version: 1,
    load: "immediately",
    onRevoke: "keep",
    setup: () =>
      new Promise<void>((resolve) => {
        const script = ensureGtagLibrary(targetId);
        configureGtag(targetId);
        if (!script || script.dataset.ckyLoaded === "true") {
          resolve();
          return;
        }
        script.addEventListener(
          "load",
          () => {
            script.dataset.ckyLoaded = "true";
            resolve();
          },
          { once: true },
        );
        // keep: a failed gtag.js load is non-fatal — the deny-default is already set.
        script.addEventListener("error", () => resolve(), { once: true });
      }),
  };
}

export type Ga4Config = {
  /** GA4 measurement id, e.g. `"G-XXXXXXX"`. */
  measurementId: string;
  /** Consent category. Default `"analytics"`. (Consent Mode governs the actual gating.) */
  category?: string;
  /** Override the integration id. Default `"ga4"`. */
  id?: string;
};

/**
 * Google Analytics 4, via Consent Mode. Loads `gtag.js` (once, shared with any
 * other Google product) and registers the measurement id. Requires the Consent
 * Mode default in the `<head>` — see {@link googleConsentModeSnippet}.
 *
 * @example
 * initCookieYes({ mode: "cookie-only", integrations: [ga4({ measurementId: "G-XXXX" })] });
 */
export function ga4(config: Ga4Config): Integration {
  return gtagIntegration(config.measurementId, {
    id: config.id ?? "ga4",
    category: config.category ?? "analytics",
  });
}

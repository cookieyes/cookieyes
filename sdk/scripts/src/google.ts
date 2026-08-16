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
const GTM_SRC = "https://www.googletagmanager.com/gtm.js";
const GTM_SCRIPT_ID = "cky-google-gtm";

function warn(message: string): void {
  if (typeof console !== "undefined") console.warn(`[cookieyes] ${message}`);
}

/** Warn (once per call site) and fall back to a deny-default if the head snippet was skipped. */
function ensureConsentModeReady(): void {
  if (typeof window === "undefined") return;
  if ((window as WindowWithGtag).__ckyGcmReady) return;
  warn(
    "Google Consent Mode default was not set before init — add the <head> snippet " +
      "(googleConsentModeSnippet / @cookieyes/nextjs) for correct first-paint behaviour. " +
      "Falling back to a deny-by-default now.",
  );
  bootstrapGoogleConsentMode();
}

/** Ensure the shared `gtag.js` library is on the page (injected once). */
function ensureGtagLibrary(firstId: string): HTMLScriptElement | null {
  if (typeof document === "undefined") return null;
  ensureConsentModeReady();
  const existing = document.getElementById(GTAG_SCRIPT_ID) as HTMLScriptElement | null;
  if (existing) return existing;
  const script = document.createElement("script");
  script.id = GTAG_SCRIPT_ID;
  script.async = true;
  script.src = `${GTAG_SRC}?id=${encodeURIComponent(firstId)}`;
  document.head.appendChild(script);
  return script;
}

/** Has a matching command already been pushed to the dataLayer? (keeps retries idempotent) */
function dataLayerHas(predicate: (cmd: unknown) => boolean): boolean {
  return ((window as WindowWithGtag).dataLayer ?? []).some(predicate);
}

/** Register one Google product on the shared gtag — once per id, even across retries. */
function configureGtag(id: string): void {
  const already = dataLayerHas((cmd) => {
    const c = cmd as Record<number, unknown>;
    return c[0] === "config" && c[1] === id;
  });
  if (!already) (window as WindowWithGtag).gtag?.("config", id);
}

/** Ensure the GTM container script is on the page (injected once). */
function ensureGtm(containerId: string): HTMLScriptElement | null {
  if (typeof document === "undefined") return null;
  ensureConsentModeReady();
  const existing = document.getElementById(GTM_SCRIPT_ID) as HTMLScriptElement | null;
  if (existing) return existing;
  const w = window as WindowWithGtag;
  const dataLayer = (w.dataLayer = w.dataLayer ?? []);
  if (!dataLayerHas((cmd) => (cmd as { event?: string }).event === "gtm.js")) {
    dataLayer.push({ "gtm.start": Date.now(), event: "gtm.js" });
  }
  const script = document.createElement("script");
  script.id = GTM_SCRIPT_ID;
  script.async = true;
  script.src = `${GTM_SRC}?id=${encodeURIComponent(containerId)}`;
  document.head.appendChild(script);
  return script;
}

/**
 * A load-immediately, keep-on-revoke integration: run `ensure` (idempotent
 * script injection) and resolve when its script loads. Consent updates are
 * handled by core's Consent Mode broadcast, so there's nothing to do on revoke.
 *
 * A load failure (e.g. an ad blocker) rejects, so the status is truthful
 * (`error`, not `active`) and the debug view tells the truth; the engine retries
 * on the next consent change. `config`/`gtm.start` are guarded, so a retry never
 * double-registers.
 */
function keepLoadIntegration(
  base: { id: string; category: string },
  ensure: () => HTMLScriptElement | null,
): Integration {
  return {
    ...base,
    version: 1,
    load: "immediately",
    onRevoke: "keep",
    setup: () =>
      new Promise<void>((resolve, reject) => {
        const script = ensure();
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
        script.addEventListener(
          "error",
          () => {
            script.remove(); // remove so a retry can re-inject
            reject(new Error(`Google script for "${base.id}" failed to load`));
          },
          { once: true },
        );
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
  return keepLoadIntegration(
    { id: config.id ?? "ga4", category: config.category ?? "analytics" },
    () => {
      const script = ensureGtagLibrary(config.measurementId);
      configureGtag(config.measurementId);
      return script;
    },
  );
}

export type GoogleAdsConfig = {
  /** Google Ads id, e.g. `"AW-XXXXXXXXX"`. */
  conversionId: string;
  /** Consent category. Default `"advertisement"`. (Consent Mode governs the actual gating.) */
  category?: string;
  /** Override the integration id. Default `"google-ads"`. */
  id?: string;
};

/**
 * Google Ads, via Consent Mode. Shares the same `gtag.js` as {@link ga4} (loaded
 * once) and registers the conversion id. Requires the Consent Mode default in
 * the `<head>` — see {@link googleConsentModeSnippet}.
 *
 * @example
 * initCookieYes({ mode: "cookie-only", integrations: [googleAds({ conversionId: "AW-XXXX" })] });
 */
export function googleAds(config: GoogleAdsConfig): Integration {
  return keepLoadIntegration(
    { id: config.id ?? "google-ads", category: config.category ?? "advertisement" },
    () => {
      const script = ensureGtagLibrary(config.conversionId);
      configureGtag(config.conversionId);
      return script;
    },
  );
}

export type GoogleTagManagerConfig = {
  /** GTM container id, e.g. `"GTM-XXXXXXX"`. */
  containerId: string;
  /** Consent category. Default `"analytics"`. (The tags inside the container are governed by Consent Mode, not this.) */
  category?: string;
  /** Override the integration id. Default `"gtm"`. */
  id?: string;
};

/**
 * Google Tag Manager, via Consent Mode. Loads the container (`gtm.js`); the tags
 * you configure inside it (GA4, Ads, others) are governed by the Consent Mode
 * signals the SDK broadcasts. Requires the Consent Mode default in the `<head>`
 * — see {@link googleConsentModeSnippet}. Use this instead of `ga4()`/`googleAds()`
 * when those products are managed *through* your container.
 *
 * @example
 * initCookieYes({ mode: "cookie-only", integrations: [googleTagManager({ containerId: "GTM-XXXX" })] });
 */
export function googleTagManager(config: GoogleTagManagerConfig): Integration {
  return keepLoadIntegration(
    { id: config.id ?? "gtm", category: config.category ?? "analytics" },
    () => ensureGtm(config.containerId),
  );
}

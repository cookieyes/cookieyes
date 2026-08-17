import type { Cleanup, Integration, SetupCtx } from "@cookieyes/core";
import { deleteCookie } from "./cookies.js";

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
  /** Pass ad-click ids through the URL when `ad_storage` is denied (Google's recommendation). Default off. */
  urlPassthrough?: boolean;
  /** Redact ad-click data while `ad_storage` is denied (Google's recommendation). Default off. */
  adsDataRedaction?: boolean;
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
    __ckyGoogleOverlapWarned?: boolean;
    __ckyGtagProducts?: Set<string>;
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
  let snippet =
    "window.dataLayer=window.dataLayer||[];" +
    "function gtag(){dataLayer.push(arguments);}" +
    "gtag('js',new Date());" +
    `gtag('consent','default',${dflt});`;
  if (options?.urlPassthrough) snippet += "gtag('set','url_passthrough',true);";
  if (options?.adsDataRedaction) snippet += "gtag('set','ads_data_redaction',true);";
  return snippet;
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
  if (options?.urlPassthrough) w.gtag("set", "url_passthrough", true);
  if (options?.adsDataRedaction) w.gtag("set", "ads_data_redaction", true);
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

/**
 * Warn (once) when both a GTM container and a standalone gtag product (GA4/Ads)
 * are **configured** — checked when the presets are created, not when they load,
 * so a `basic` or blocked tag can't hide the clash. If the container also loads
 * GA4/Ads, they fire twice; we can't see inside the container, so this is a
 * heads-up. Detection is by which preset was called, so custom ids don't matter.
 */
let sawGoogleContainer = false;
let sawGoogleTag = false;
let overlapCheckScheduled = false;
function noteGoogleProduct(kind: "container" | "tag"): void {
  if (kind === "container") sawGoogleContainer = true;
  else sawGoogleTag = true;
  if (overlapCheckScheduled || typeof queueMicrotask === "undefined") return;
  overlapCheckScheduled = true;
  // Batch across one config build (the integrations array is created in one tick).
  queueMicrotask(() => {
    if (sawGoogleContainer && sawGoogleTag) warnGoogleOverlap();
    sawGoogleContainer = false;
    sawGoogleTag = false;
    overlapCheckScheduled = false;
  });
}

function warnGoogleOverlap(): void {
  const scope = (typeof window !== "undefined" ? window : globalThis) as WindowWithGtag;
  if (scope.__ckyGoogleOverlapWarned) return;
  scope.__ckyGoogleOverlapWarned = true;
  warn(
    "both Google Tag Manager and a gtag product (GA4/Ads) are configured. If your " +
      "container also loads GA4/Ads, they will fire twice — use googleTagManager() OR " +
      "ga4()/googleAds() for the same product, not both.",
  );
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
function configureGtag(id: string, params?: Record<string, unknown>): void {
  const already = dataLayerHas((cmd) => {
    const c = cmd as Record<number, unknown>;
    return c[0] === "config" && c[1] === id;
  });
  if (already) return;
  const gtag = (window as WindowWithGtag).gtag;
  if (params) gtag?.("config", id, params);
  else gtag?.("config", id);
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
 * Wait for an injected script to load; resolve via `onLoaded`, reject on error
 * (so status is truthful `error` — the engine retries; `config`/`gtm.start` are
 * guarded so a retry never double-registers). A load failure removes the script
 * so a retry can re-inject.
 */
function awaitScript(
  script: HTMLScriptElement | null,
  id: string,
  onLoaded: () => void,
  reject: (err: Error) => void,
): void {
  if (!script || script.dataset.ckyLoaded === "true") {
    onLoaded();
    return;
  }
  script.addEventListener(
    "load",
    () => {
      script.dataset.ckyLoaded = "true";
      onLoaded();
    },
    { once: true },
  );
  script.addEventListener(
    "error",
    () => {
      script.remove();
      reject(new Error(`Google script for "${id}" failed to load`));
    },
    { once: true },
  );
}

/**
 * A Google integration. `"advanced"` loads immediately and keeps the tag on
 * revoke (Consent Mode sends cookieless pings — handled by core's broadcast).
 * `"basic"` loads only after consent and **removes** the tag on revoke (running
 * `teardown`), so nothing — not even a cookieless ping — happens once withdrawn.
 */
function googleIntegration(
  base: { id: string; category: string },
  strategy: GoogleConsentModeStrategy,
  ensure: (ctx: SetupCtx) => HTMLScriptElement | null,
  teardown: () => void,
): Integration {
  if (strategy === "basic") {
    return {
      ...base,
      version: 1,
      load: "afterConsent",
      onRevoke: "remove",
      setup: (ctx) =>
        new Promise<Cleanup>((resolve, reject) => {
          awaitScript(ensure(ctx), base.id, () => resolve(teardown), reject);
        }),
    };
  }
  return {
    ...base,
    version: 1,
    load: "immediately",
    onRevoke: "keep",
    setup: (ctx) =>
      new Promise<void>((resolve, reject) => {
        awaitScript(ensure(ctx), base.id, resolve, reject);
      }),
  };
}

/**
 * Consent Mode strategy. `"advanced"` (default) loads `gtag.js` immediately and
 * sends cookieless pings while consent is denied (Google's modelling). `"basic"`
 * loads the tag **only after** the category is granted — nothing is sent, and no
 * cookieless pings, until the visitor consents.
 */
export type GoogleConsentModeStrategy = "advanced" | "basic";

/** The gtag products currently loaded (by integration id) — so a Basic teardown only removes the shared library when it's the last one. */
function gtagProducts(): Set<string> {
  const scope = (typeof window !== "undefined" ? window : globalThis) as WindowWithGtag;
  scope.__ckyGtagProducts ??= new Set<string>();
  return scope.__ckyGtagProducts;
}

/**
 * Basic-mode teardown for a gtag product: clear **only this product's** cookies
 * (so revoking analytics doesn't wipe Ads' cookies, or vice versa), and remove
 * the shared `gtag.js` only when no other gtag product is still active.
 */
function teardownGtagProduct(id: string, cookies: string[]): void {
  if (typeof document === "undefined") return;
  const products = gtagProducts();
  products.delete(id);
  for (const name of cookies) deleteCookie(name);
  if (products.size === 0) document.getElementById(GTAG_SCRIPT_ID)?.remove();
}

/** Basic-mode teardown for GTM: remove the container script (its own, not shared). */
function removeGtm(): void {
  if (typeof document === "undefined") return;
  document.getElementById(GTM_SCRIPT_ID)?.remove();
}

export type Ga4Config = {
  /** GA4 measurement id, e.g. `"G-XXXXXXX"`. */
  measurementId: string;
  /** Consent category. Default `"analytics"`. (Consent Mode governs the actual gating.) */
  category?: string;
  /** Override the integration id. Default `"ga4"`. */
  id?: string;
  /** Extra `gtag('config', …)` params, e.g. `{ send_page_view: false }` (SPAs) or `{ debug_mode: true }`. */
  params?: Record<string, unknown>;
  /** Consent Mode strategy — `"advanced"` (default) or `"basic"`. See {@link GoogleConsentModeStrategy}. */
  consentMode?: GoogleConsentModeStrategy;
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
  noteGoogleProduct("tag");
  const id = config.id ?? "ga4";
  // GA4's own cookies: `_ga`, `_gid`, `_gat`, and per-property `_ga_<id without G->`.
  const cookies = ["_ga", "_gid", "_gat", `_ga_${config.measurementId.replace(/^G-/, "")}`];
  return googleIntegration(
    { id, category: config.category ?? "analytics" },
    config.consentMode ?? "advanced",
    () => {
      gtagProducts().add(id);
      const script = ensureGtagLibrary(config.measurementId);
      configureGtag(config.measurementId, config.params);
      return script;
    },
    () => teardownGtagProduct(id, cookies),
  );
}

export type GoogleAdsConfig = {
  /** Google Ads id, e.g. `"AW-XXXXXXXXX"`. */
  conversionId: string;
  /** Consent category. Default `"advertisement"`. (Consent Mode governs the actual gating.) */
  category?: string;
  /** Override the integration id. Default `"google-ads"`. */
  id?: string;
  /** Extra `gtag('config', …)` params for the Ads tag. */
  params?: Record<string, unknown>;
  /** Consent Mode strategy — `"advanced"` (default) or `"basic"`. */
  consentMode?: GoogleConsentModeStrategy;
  /**
   * Google's Restricted Data Processing (US/California). Leave unset to enable it
   * automatically for a US opt-out (CCPA) visitor; `true`/`false` forces it.
   */
  restrictedDataProcessing?: boolean;
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
  noteGoogleProduct("tag");
  const id = config.id ?? "google-ads";
  return googleIntegration(
    { id, category: config.category ?? "advertisement" },
    config.consentMode ?? "advanced",
    (ctx) => {
      gtagProducts().add(id);
      const script = ensureGtagLibrary(config.conversionId);
      // Restricted Data Processing: explicit config wins; otherwise on for a US opt-out (CCPA) visitor.
      const rdp = config.restrictedDataProcessing ?? ctx.region.regulation === "CCPA";
      const rdpSet = dataLayerHas((cmd) => {
        const c = cmd as Record<number, unknown>;
        return c[0] === "set" && c[1] === "restricted_data_processing";
      });
      if (rdp && !rdpSet) (window as WindowWithGtag).gtag?.("set", "restricted_data_processing", true);
      configureGtag(config.conversionId, config.params);
      return script;
    },
    // Ads' own cookie is `_gcl_au` — clearing GA4's `_ga*` here would break analytics.
    () => teardownGtagProduct(id, ["_gcl_au"]),
  );
}

export type GoogleTagManagerConfig = {
  /** GTM container id, e.g. `"GTM-XXXXXXX"`. */
  containerId: string;
  /** Consent category. Default `"analytics"`. (The tags inside the container are governed by Consent Mode, not this.) */
  category?: string;
  /** Override the integration id. Default `"gtm"`. */
  id?: string;
  /** Consent Mode strategy — `"advanced"` (default) or `"basic"`. */
  consentMode?: GoogleConsentModeStrategy;
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
  noteGoogleProduct("container");
  return googleIntegration(
    { id: config.id ?? "gtm", category: config.category ?? "analytics" },
    config.consentMode ?? "advanced",
    () => ensureGtm(config.containerId),
    () => removeGtm(),
  );
}

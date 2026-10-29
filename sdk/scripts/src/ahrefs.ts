import type { Integration, SilenceControl } from "@cookieyes/core";
import { devTrackScript } from "./dev-queue.js";

export type AhrefsAnalyticsConfig = {
  /** Your Ahrefs Web Analytics key (the `data-key` value in Ahrefs' snippet). */
  key: string;
  /**
   * Where to load `analytics.js` from. Default
   * `"https://analytics.ahrefs.com/analytics.js"`. Point it at a path on your own
   * domain that proxies Ahrefs, so ad blockers that match on Ahrefs' domain miss it.
   */
  scriptUrl?: string | undefined;
  /**
   * Where Ahrefs sends events (its `data-api` attribute). Default: `/api/event` on
   * the origin of `scriptUrl`, Ahrefs' own default. Set it when your proxy serves
   * the event endpoint from a different path.
   */
  apiUrl?: string | undefined;
  /**
   * Default `true`: wait for the category, like any other analytics tool. Set
   * `false` only if your own legal advice says Ahrefs needs no consent on your
   * site; it then loads straight away and ignores consent changes.
   */
  requireConsent?: boolean | undefined;
  /** Consent category that gates it. Default `"analytics"`. */
  category?: string | undefined;
  /** Override the integration id (only needed if you run more than one). Default `"ahrefs"`. */
  id?: string | undefined;
};

/**
 * Ahrefs Web Analytics (cookie-free page views and events), consent-gated.
 *
 * Nothing loads until the category is granted (`load: "afterConsent"`). Ahrefs
 * has no stop command, and removing its tag does not stop it: its link, form and
 * page-view listeners stay installed. What it does do is read `data-key` from its
 * tag before every event and drop the event when the key is missing. So on
 * withdrawal we remove the key (`onRevoke: "silence"`) and nothing more is sent;
 * on re-grant we put it back. No reload is needed.
 *
 * With `requireConsent: false` it loads at once and ignores consent
 * (`load: "immediately"`, `onRevoke: "keep"`). That is the site owner's legal
 * call, not a default.
 *
 * `setup` resolves only when the tag has actually loaded (rejects if it fails), so
 * the engine's status is truthful. Send events with
 * `safeCall("AhrefsAnalytics", "sendEvent", …)`: it is a no-op before the tag loads.
 *
 * @example
 * initCookieYes({ mode: "cookie-only", integrations: [ahrefsAnalytics({ key: "abc123" })] });
 */
export function ahrefsAnalytics(config: AhrefsAnalyticsConfig): Integration {
  const id = config.id ?? "ahrefs";
  const category = config.category ?? "analytics";

  if (config.requireConsent === false) {
    return {
      id,
      category,
      version: 1,
      load: "immediately",
      onRevoke: "keep",
      setup: () => loadAhrefs(config).then(() => undefined),
    };
  }

  return {
    id,
    category,
    version: 1,
    load: "afterConsent",
    onRevoke: "silence",
    setup: () =>
      loadAhrefs(config).then(
        (script): SilenceControl => ({
          silence: () => script?.removeAttribute("data-key"),
          resume: () => script?.setAttribute("data-key", config.key),
        }),
      ),
  };
}

const SCRIPT_ID = "cky-ahrefs";

/**
 * Put the tag on the page with its key and wait for it to load. Resolves with the
 * `<script>` element, or `null` in SSR. A tag left by an earlier load (for example
 * one that was silenced before a runtime reset) gets its key back and resolves at
 * once: Ahrefs refuses to start twice on one page, so it must not be injected again.
 */
function loadAhrefs(config: AhrefsAnalyticsConfig): Promise<HTMLScriptElement | null> {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return Promise.resolve(null);
  }

  const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
  if (existing?.dataset.ckyLoaded === "true") {
    existing.setAttribute("data-key", config.key);
    return Promise.resolve(existing);
  }

  const script = existing ?? document.createElement("script");
  if (!existing) {
    script.id = SCRIPT_ID;
    script.async = true;
    script.src = config.scriptUrl ?? "https://analytics.ahrefs.com/analytics.js";
    script.setAttribute("data-key", config.key);
    if (config.apiUrl) script.setAttribute("data-api", config.apiUrl);
    devTrackScript(script);
    document.head.appendChild(script);
  }

  return new Promise((resolve, reject) => {
    script.addEventListener(
      "load",
      () => {
        script.dataset.ckyLoaded = "true";
        resolve(script);
      },
      { once: true },
    );
    script.addEventListener(
      "error",
      () => {
        script.remove(); // remove so a retry re-injects
        reject(new Error("Ahrefs Web Analytics (analytics.js) failed to load"));
      },
      { once: true },
    );
  });
}

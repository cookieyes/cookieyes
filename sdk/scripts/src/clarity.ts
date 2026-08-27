import type { Integration, SilenceControl } from "@cookieyes/core";

export type ClarityConfig = {
  /** Your Microsoft Clarity project id (the id in `clarity.ms/tag/<id>`). */
  projectId: string;
  /**
   * Consent category that gates it. Default `"analytics"`. Session recording is a
   * higher-risk kind of tracking than ordinary analytics — consider a dedicated
   * category (e.g. `"session_recording"`) if your taxonomy has one.
   */
  category?: string;
  /** Override the integration id (only needed if you run more than one). Default `"clarity"`. */
  id?: string;
};

/**
 * Microsoft Clarity (session recording + heatmaps), consent-gated.
 *
 * Nothing loads until the category is granted (`load: "afterConsent"`). On grant
 * we tell Clarity's Consent v2 API that cookies are allowed; on withdrawal we tell
 * it consent is denied (`onRevoke: "silence"`) rather than removing the tag —
 * Clarity then deletes its own `_clck` / `_clsk` cookies and keeps running in
 * **no-consent mode** (cookie-free), the same shape as Meta/Google.
 *
 * Requires the **Cookies** toggle turned **off** in your Clarity project
 * (*Settings → Setup → Advanced settings → Cookies*) — this is Clarity's Consent
 * Mode: it makes Clarity wait for consent instead of setting cookies on load.
 * Otherwise the gate does nothing. (Auto-on for EEA/UK/CH visitors.)
 *
 * `setup` resolves only when the tag has actually loaded (rejects if it fails), so
 * the engine's status is truthful: `loading` → `active`, `silenced`, or `error`.
 *
 * Guard calls to `clarity(...)` before the first grant: `window.clarity?.("event", …)`.
 *
 * @example
 * initCookieYes({ mode: "cookie-only", integrations: [clarity({ projectId: "abc123" })] });
 */
export function clarity(config: ClarityConfig): Integration {
  return {
    id: config.id ?? "clarity",
    category: config.category ?? "analytics",
    version: 1,
    load: "afterConsent",
    onRevoke: "silence",
    setup: () =>
      new Promise<SilenceControl>((resolve, reject) => {
        const control: SilenceControl = { silence: denyClarity, resume: grantClarity };
        const script = ensureClarity(config.projectId);
        if (!script || script.dataset.ckyLoaded === "true") {
          grantClarity(); // setup only runs once granted — allow cookies now
          resolve(control); // no DOM (SSR), or already loaded
          return;
        }
        grantClarity(); // queued by the stub, replayed when the tag loads
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
            script.remove(); // remove so a retry re-injects
            reject(new Error("Microsoft Clarity (tag) failed to load"));
          },
          { once: true },
        );
      }),
  };
}

const SCRIPT_ID = "cky-clarity";

// Clarity's `window.clarity` stub: a function that queues calls until the tag
// loads and replays them. A faithful port of Clarity's official snippet.
type ClarityFn = ((...args: unknown[]) => void) & { q?: unknown[][] };
type WindowWithClarity = Window & typeof globalThis & { clarity?: ClarityFn };

/**
 * Ensure the `window.clarity` stub exists (idempotent) and the tag is on the page.
 * Returns the `<script>` element (or `null` in SSR). Re-injects if a prior load
 * failed and removed it.
 */
function ensureClarity(projectId: string): HTMLScriptElement | null {
  if (typeof window === "undefined" || typeof document === "undefined") return null;
  const w = window as WindowWithClarity;

  if (!w.clarity) {
    const c: ClarityFn = (...args: unknown[]) => {
      (c.q = c.q ?? []).push(args);
    };
    w.clarity = c;
  }

  const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
  if (existing) return existing;
  const script = document.createElement("script");
  script.id = SCRIPT_ID;
  script.async = true;
  script.src = `https://www.clarity.ms/tag/${projectId}`;
  document.head.appendChild(script);
  return script;
}

/**
 * Pass consent to Clarity's Consent v2 API. Both signals move together with the
 * gating category, so the state is identical at startup and after every change
 * (no silent flattening). Note the capital `S` — Clarity's exact key names.
 */
function setClarityConsent(state: "granted" | "denied"): void {
  (window as WindowWithClarity).clarity?.("consentv2", {
    ad_Storage: state,
    analytics_Storage: state,
  });
}

/** Allow cookies + cross-session tracking. */
function grantClarity(): void {
  if (typeof window === "undefined") return;
  setClarityConsent("granted");
}

/**
 * Deny consent: Clarity deletes its own `_clck` / `_clsk` cookies and continues in
 * no-consent mode (cookie-free) — it does **not** stop sending. The script stays.
 */
function denyClarity(): void {
  if (typeof window === "undefined") return;
  setClarityConsent("denied");
}

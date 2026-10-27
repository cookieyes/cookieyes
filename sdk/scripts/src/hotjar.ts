import type { Cleanup, Integration, SetupCtx } from "@cookieyes/core";
import { deleteCookie } from "./cookies.js";
import { devTrackScript } from "./dev-queue.js";

/** Declared locally so the guard survives as a literal; see core's `deprecations.ts`. */
declare const process: { env: { NODE_ENV?: string } };

export type HotjarConfig = {
  /** Your Hotjar site ID (the `hjid` value in Hotjar's snippet). */
  siteId: number;
  /** Hotjar's snippet version (the `hjsv` value). Default `6`. */
  snippetVersion?: number | undefined;
  /**
   * Load Hotjar from this URL instead of
   * `https://static.hotjar.com/c/hotjar-<siteId>.js?sv=<snippetVersion>`.
   */
  scriptUrl?: string | undefined;
  /**
   * Reload the page when consent is withdrawn. Default `false`. Hotjar has no stop
   * command, so without a reload it keeps recording until the next page load.
   */
  reloadOnRevoke?: boolean | undefined;
  /** Consent category that gates it. Default `"analytics"`. */
  category?: string | undefined;
  /** Override the integration id (only needed if you run more than one). Default `"hotjar"`. */
  id?: string | undefined;
};

/**
 * Hotjar (session recording, heatmaps, surveys), consent-gated.
 *
 * Nothing loads, and nothing is queued, until the category is granted
 * (`load: "afterConsent"`). On withdrawal (`onRevoke: "remove"`) we delete every
 * `_hj*` cookie, Hotjar's storage keys, its widgets and its script tags.
 *
 * Hotjar has no stop command: tested live, it keeps recording after its cookies,
 * storage and tags are gone, and neither `hj.optOut` nor anything else stops it.
 * Only a page load does. So `reloadOnRevoke: true` reloads at once; without it,
 * Hotjar stops on the next page load. `window.hj` is deliberately kept: deleting
 * it makes Hotjar's running loop throw on every tick until the page unloads.
 *
 * For the same reason a re-grant on the same page never loads a second copy; the
 * copy still in memory carries on, and a fresh session starts on the next load.
 *
 * Send calls with {@link hotjarEvent}, {@link hotjarIdentify} and
 * {@link hotjarStateChange}: they do nothing without consent.
 *
 * @example
 * initCookieYes({ mode: "cookie-only", integrations: [hotjar({ siteId: 1234567 })] });
 */
export function hotjar(config: HotjarConfig): Integration {
  return {
    id: config.id ?? "hotjar",
    category: config.category ?? "analytics",
    version: 1,
    load: "afterConsent",
    onRevoke: "remove",
    setup: (ctx) =>
      new Promise<Cleanup>((resolve, reject) => {
        const cleanup = () => removeHotjar(config, ctx);
        if (typeof window === "undefined" || typeof document === "undefined") {
          resolve(cleanup);
          return;
        }
        const w = window as WindowWithHotjar;
        consented = true;
        if (w._hjSettings) {
          resolve(cleanup); // already on this page: never start a second copy
          return;
        }

        // Hotjar's own snippet, created only now that consent is granted.
        const stub: HotjarFn = (...args: unknown[]) => {
          stub.q = stub.q ?? [];
          stub.q.push(args);
        };
        w.hj = stub;
        w._hjSettings = { hjid: config.siteId, hjsv: config.snippetVersion ?? 6 };

        const script = document.createElement("script");
        script.id = SCRIPT_ID;
        script.async = true;
        script.src =
          config.scriptUrl ??
          `https://static.hotjar.com/c/hotjar-${config.siteId}.js?sv=${w._hjSettings.hjsv}`;
        script.addEventListener("load", () => resolve(cleanup), { once: true });
        script.addEventListener(
          "error",
          () => {
            // Undo the snippet so a retry starts from scratch.
            script.remove();
            w.hj = undefined;
            w._hjSettings = undefined;
            consented = false;
            reject(new Error("Hotjar failed to load"));
          },
          { once: true },
        );
        devTrackScript(script);
        document.head.appendChild(script);
      }),
  };
}

/** Send a Hotjar event. Does nothing before consent or after withdrawal. */
export function hotjarEvent(name: string): void {
  send(["event", name]);
}

/**
 * Identify the visitor to Hotjar. `userId` and `attributes` are personal data:
 * send only what your privacy notice covers. Does nothing without consent.
 */
export function hotjarIdentify(
  userId: string | null,
  attributes?: Record<string, string | number | boolean> | undefined,
): void {
  send(attributes ? ["identify", userId, attributes] : ["identify", userId]);
}

/**
 * Tell Hotjar the page changed. Hotjar detects URL changes itself; call this only
 * if you switched its URL tracking to manual. Does nothing without consent.
 */
export function hotjarStateChange(url: string): void {
  send(["stateChange", url]);
}

const SCRIPT_ID = "cky-hotjar";

type HotjarFn = ((...args: unknown[]) => void) & { q?: unknown[][] };
type WindowWithHotjar = Window &
  typeof globalThis & {
    hj?: HotjarFn | undefined;
    _hjSettings?: { hjid: number; hjsv: number } | undefined;
  };

// Hotjar is loaded and consent has not been withdrawn since. `window.hj` alone
// can't tell, because it stays on the page after a withdrawal.
let consented = false;
let warned = false;

function send(args: unknown[]): void {
  const hj = typeof window !== "undefined" ? (window as WindowWithHotjar).hj : undefined;
  if (consented && hj) {
    hj(...args);
    return;
  }
  if (process.env.NODE_ENV !== "production" && !warned) {
    warned = true;
    console.warn(
      "[cookieyes] Hotjar call dropped: the visitor has not granted Hotjar's consent " +
        "category. Calls made before consent are not kept for later.",
    );
  }
}

/**
 * Delete everything Hotjar left on the device and the page, then reload when
 * asked. Recording itself carries on until the page unloads (see {@link hotjar}).
 */
function removeHotjar(config: HotjarConfig, ctx: SetupCtx): void {
  consented = false;
  if (typeof window === "undefined" || typeof document === "undefined") return;

  for (const pair of document.cookie.split(";")) {
    const name = pair.split("=")[0]?.trim();
    if (name?.startsWith("_hj")) deleteCookie(name);
  }
  for (const storage of ["localStorage", "sessionStorage"] as const) {
    try {
      const store = window[storage];
      for (const key of Object.keys(store)) if (/^_hj|^hj[A-Z]/.test(key)) store.removeItem(key);
    } catch {
      // Storage can throw (private mode / disabled): non-fatal.
    }
  }
  // Our tag, the modules Hotjar loaded, and its widgets, surveys and iframes. A class
  // must start with `_hj`, so a site's own `card_hj` is left alone.
  for (const el of document.querySelectorAll(
    `#${SCRIPT_ID}, script[src*="hotjar.com"], [id^="_hj"], [name^="_hj"], [class^="_hj"], [class*=" _hj"]`,
  )) {
    el.remove();
  }

  // Only on a real withdrawal, not when the SDK is torn down with consent still granted.
  if (config.reloadOnRevoke && !ctx.granted()) window.location.reload();
}

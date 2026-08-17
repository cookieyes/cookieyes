import type { Integration, SilenceControl } from "@cookieyes/core";
import { deleteCookie } from "./cookies.js";

export type MetaPixelConfig = {
  /** Your Meta Pixel ID (the numeric id from Events Manager). */
  pixelId: string;
  /** Consent category that gates it. Default `"advertisement"`. */
  category?: string;
  /** Override the integration id (only needed if you run more than one). Default `"meta"`. */
  id?: string;
  /** Send the automatic first-page `PageView`. Default `true`; set `false` to track pages yourself (SPAs). */
  autoPageView?: boolean;
  /**
   * Meta Limited Data Use (US privacy). Leave unset to enable it automatically
   * for a US opt-out visitor (CCPA); `true`/`false` forces it on/off.
   */
  limitedDataUse?: boolean;
};

/**
 * Meta Pixel (`fbq`), consent-gated.
 *
 * Nothing loads until the category is granted. On withdrawal we use Meta's own
 * consent API — `fbq('consent', 'revoke')` — rather than tearing the script down
 * (`onRevoke: "silence"`), and clear Meta's `_fbp` / `_fbc` cookies (Meta's own
 * revoke leaves them). A re-grant calls `fbq('consent', 'grant')`, so tracking
 * resumes without re-downloading the library.
 *
 * `setup` resolves only when `fbevents.js` has actually loaded (and rejects if it
 * fails), so the engine's status is truthful: `loading` → `active`, `silenced`,
 * or `error` (retried on the next consent change).
 *
 * Events sent while silenced are held by Meta's own consent mechanism and
 * delivered if consent is re-granted — not dropped. To call `fbq` before it has
 * loaded (or after a revoke), guard it: `window.fbq?.("track", "Purchase")`.
 *
 * @example
 * initCookieYes({ mode: "cookie-only", integrations: [metaPixel({ pixelId: "123" })] });
 */
export function metaPixel(config: MetaPixelConfig): Integration {
  return {
    id: config.id ?? "meta",
    category: config.category ?? "advertisement",
    version: 1,
    load: "afterConsent",
    onRevoke: "silence",
    setup: (ctx) =>
      new Promise<SilenceControl>((resolve, reject) => {
        const control: SilenceControl = { silence: silenceMeta, resume: resumeMeta };
        // Limited Data Use: explicit config wins; otherwise on for a US opt-out (CCPA) visitor.
        const ldu = config.limitedDataUse ?? ctx.region.regulation === "CCPA";
        const script = ensureMeta(config.pixelId, {
          autoPageView: config.autoPageView ?? true,
          limitedDataUse: ldu,
        });
        if (!script) {
          resolve(control); // no DOM (SSR) — nothing to wait for
          return;
        }
        if (script.dataset.ckyLoaded === "true") {
          resolve(control); // already loaded
          return;
        }
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
            reject(new Error("Meta Pixel (fbevents.js) failed to load"));
          },
          { once: true },
        );
      }),
  };
}

const FBEVENTS = "https://connect.facebook.net/en_US/fbevents.js";
const SCRIPT_ID = "cky-meta-pixel";

// Meta's `fbq` stub: a function that runs queued calls once the real library
// loads. A faithful port of Meta's official base-code snippet.
type FbqStub = ((...args: unknown[]) => void) & {
  callMethod?: (...args: unknown[]) => void;
  queue: unknown[][];
  push: FbqStub;
  loaded: boolean;
  version: string;
};
type WindowWithFbq = Window &
  typeof globalThis & { fbq?: FbqStub; _fbq?: FbqStub; __ckyFbqInit?: Set<string> };

/**
 * Ensure the `window.fbq` stub exists (idempotent), init the pixel once (with
 * Limited Data Use + the first `PageView` if enabled), and put `fbevents.js` on
 * the page. Returns the `<script>` element (or `null` in SSR). Re-injects the
 * script if a prior load failed — without re-queuing `init`/`PageView`, so a
 * retry never double-counts.
 */
function ensureMeta(
  pixelId: string,
  opts: { autoPageView: boolean; limitedDataUse: boolean },
): HTMLScriptElement | null {
  if (typeof window === "undefined" || typeof document === "undefined") return null;
  const w = window as WindowWithFbq;

  if (!w.fbq) {
    const fbq = ((...args: unknown[]) => {
      if (fbq.callMethod) fbq.callMethod(...args);
      else fbq.queue.push(args);
    }) as FbqStub;
    fbq.queue = [];
    fbq.push = fbq;
    fbq.loaded = true;
    fbq.version = "2.0";
    w.fbq = fbq;
    if (!w._fbq) w._fbq = fbq;
  }

  // Init once per pixel. A retry after a failed load re-injects the script below,
  // but must not re-queue init/PageView (that was the double-PageView bug).
  const inited = (w.__ckyFbqInit ??= new Set<string>());
  if (!inited.has(pixelId)) {
    inited.add(pixelId);
    if (opts.limitedDataUse) w.fbq("dataProcessingOptions", ["LDU"], 0, 0);
    w.fbq("init", pixelId);
    if (opts.autoPageView) w.fbq("track", "PageView");
  }

  const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
  if (existing) return existing;
  const script = document.createElement("script");
  script.id = SCRIPT_ID;
  script.async = true;
  script.src = FBEVENTS;
  document.head.appendChild(script);
  return script;
}

/** Tell Meta to stop, and clear its identifiers (Meta's own revoke doesn't). */
function silenceMeta(): void {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  (window as WindowWithFbq).fbq?.("consent", "revoke");
  for (const name of ["_fbp", "_fbc"]) deleteCookie(name);
}

/** Tell Meta it may resume tracking. */
function resumeMeta(): void {
  if (typeof window === "undefined") return;
  (window as WindowWithFbq).fbq?.("consent", "grant");
}

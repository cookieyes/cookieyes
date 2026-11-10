import type { Integration, SilenceControl } from "@cookieyes/core";
import { deleteCookie } from "./cookies.js";
import { devTrackScript } from "./dev-queue.js";

/** Declared locally so the guard survives as a literal; see core's `deprecations.ts`. */
declare const process: { env: { NODE_ENV?: string } };

export type MicrosoftUetConfig = {
  /** Your UET tag id: the `ti` value in the snippet Microsoft Advertising gives you. */
  tagId: string;
  /**
   * What UET does before the visitor decides. Default `"basic"`.
   * - `"basic"`: nothing loads until the category is granted. On withdrawal UET is
   *   told consent is denied and silenced, and its `_uet*` cookies are deleted.
   * - `"advanced"`: Microsoft's recommended setup. UET loads for every visitor with
   *   consent denied by default, so it sends cookieless beacons to Microsoft before
   *   any decision. A grant or a withdrawal updates the signal; the tag stays.
   */
  consentMode?: "basic" | "advanced" | undefined;
  /**
   * Count route changes in a single-page app as page loads (UET's own
   * `enableAutoSpaTracking`). Default `true`; set `false` and call
   * {@link uetPageLoad} yourself.
   */
  autoSpaTracking?: boolean | undefined;
  /**
   * Microsoft's "do not send" cookie (`_uetmsdns`) for visitors who opt out of
   * data sharing. Leave unset to set it for a US opt-out visitor (CCPA);
   * `true`/`false` forces it on/off. It only matters in `"advanced"` mode, where
   * it keeps the tag silent for that visitor; `"basic"` mode is silent anyway.
   */
  restrictDataSharing?: boolean | undefined;
  /** Consent category that gates it. Default `"advertisement"`. */
  category?: string | undefined;
  /** Override the integration id (only needed if you run more than one). Default `"microsoft-uet"`. */
  id?: string | undefined;
};

/** Parameters for {@link uetEvent}, in UET's own names. */
export type UetEventParams = {
  event_category?: string | undefined;
  event_label?: string | undefined;
  event_value?: number | undefined;
  revenue_value?: number | undefined;
  currency?: string | undefined;
  [key: string]: unknown;
};

/**
 * Microsoft Advertising UET (`bat.js`), consent-gated, with Microsoft's consent
 * mode signal (`consent default` / `consent update` with `ad_storage`).
 *
 * `"basic"` (default): nothing loads until the category is granted
 * (`load: "afterConsent"`). On withdrawal (`onRevoke: "silence"`) we push
 * `update denied`, silence the running tag, set Microsoft's `_uetmsdns` cookie so
 * the next page load sends nothing either, and delete the `_uet*` cookies and
 * their localStorage copies. No reload. A re-grant reverses that on the same
 * tag: `bat.js` is never loaded twice, because a second copy double-counts.
 *
 * `"advanced"`: UET loads for everyone with `default denied`
 * (`load: "immediately"`), so Microsoft gets cookieless beacons (`asc=D`) before
 * consent. A grant pushes `update granted`; a withdrawal pushes `update denied`
 * and deletes the cookies, and the tag keeps sending cookieless.
 *
 * The tag is built with `enableAutoConsent: false`, so it acts on our signal
 * only. Send calls with {@link uetEvent} and {@link uetPageLoad}; they do
 * nothing until UET is on the page.
 *
 * @example
 * initCookieYes({ mode: "cookie-only", integrations: [microsoftUet({ tagId: "12345678" })] });
 */
export function microsoftUet(config: MicrosoftUetConfig): Integration {
  const advanced = config.consentMode === "advanced";
  const tagId = config.tagId.trim();
  return {
    id: config.id ?? "microsoft-uet",
    category: config.category ?? "advertisement",
    version: 1,
    load: advanced ? "immediately" : "afterConsent",
    onRevoke: "silence",
    setup: (ctx) =>
      new Promise<SilenceControl>((resolve, reject) => {
        // The "do not send" cookie: explicit config wins; otherwise on for a US
        // opt-out (CCPA) visitor. Basic mode is silent on withdrawal regardless.
        const restrict = config.restrictDataSharing ?? ctx.region.regulation === "CCPA";
        const silent = !advanced || restrict;
        const control: SilenceControl = { silence: () => deny(silent), resume: allow };
        if (typeof window === "undefined" || typeof document === "undefined") {
          resolve(control);
          return;
        }
        if (!tagId) {
          console.error("[cookieyes] microsoftUet: tagId is empty, so UET will not load.");
          resolve(control);
          return;
        }
        const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
        if (existing?.dataset.ckyLoaded === "true") {
          // A restart with the tag already on the page: the previous runner
          // silenced it on teardown, so tell it where consent stands now.
          if (ctx.granted()) allow();
          else deny(silent);
          resolve(control);
          return;
        }
        const granted = ctx.granted();
        const script =
          existing ??
          inject(tagId, {
            granted,
            silent: silent && !granted,
            autoSpaTracking: config.autoSpaTracking ?? true,
          });
        if (advanced && !granted) noteAdvancedMode();
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
            // Undo this attempt so a retry pushes the default signal once, not twice.
            script.remove();
            const w = window as WindowWithUet;
            if (Array.isArray(w.uetq)) delete w.uetq;
            reject(new Error("Microsoft UET (bat.js) failed to load"));
          },
          { once: true },
        );
      }),
  };
}

/**
 * Send a UET custom event, for example a conversion:
 * `uetEvent("purchase", { revenue_value: 49, currency: "EUR" })`. Does nothing
 * until UET is on the page; in `"basic"` mode that is until the visitor accepts,
 * and nothing after a withdrawal.
 */
export function uetEvent(name: string, params: UetEventParams = {}): void {
  if (!push("event", name, params)) warnDropped();
}

/**
 * Count a page load yourself, for a single-page app with `autoSpaTracking: false`.
 * Does nothing until UET is on the page.
 */
export function uetPageLoad(): void {
  if (!push("pageLoad")) warnDropped();
}

const SCRIPT_ID = "cky-microsoft-uet";
const BAT_JS = "https://bat.bing.com/bat.js";
/** Microsoft's own "do not send events" switch, read by the tag when it starts. */
const DNS_COOKIE = "_uetmsdns";
/** UET's first-party identifiers; each is mirrored in localStorage with an `_exp` key. */
const UET_COOKIES = ["_uetsid", "_uetvid", "_uetmsclkid"];

type ConsentSignal = "granted" | "denied";
/** The constructed tag: a `push` method plus the config object it reads at runtime. */
type UetTag = {
  push: (...args: unknown[]) => unknown;
  uetConfig?: { msDns?: boolean | undefined } | undefined;
};
type WindowWithUet = Window &
  typeof globalThis & {
    uetq?: unknown[] | UetTag | undefined;
    UET?: (new (options: Record<string, unknown>) => UetTag) | undefined;
    __ckyUetSignal?: ConsentSignal | undefined;
  };

/** Push to the queue or the tag, whichever is there. `false` when neither is. */
function push(...args: unknown[]): boolean {
  const uetq = typeof window !== "undefined" ? (window as WindowWithUet).uetq : undefined;
  if (!uetq) return false;
  uetq.push(...args);
  return true;
}

/** Push `consent update` only when the signal changes, so a withdrawal after a denied default sends one ping, not two. */
function signal(value: ConsentSignal): void {
  const w = window as WindowWithUet;
  if (w.__ckyUetSignal === value) return;
  w.__ckyUetSignal = value;
  push("consent", "update", { ad_storage: value });
}

/**
 * Create `uetq` with the consent default and add `bat.js`. Once it loads, build
 * the tag the way Microsoft's snippet does (`new UET(o)`, then `pageLoad`). The
 * tag reads `_uetmsdns` only when it is built, so the cookie is set first.
 */
function inject(
  tagId: string,
  opts: { granted: boolean; silent: boolean; autoSpaTracking: boolean },
): HTMLScriptElement {
  const w = window as WindowWithUet;
  setDoNotSend(opts.silent);
  w.uetq ??= [];
  w.__ckyUetSignal = opts.granted ? "granted" : "denied";
  w.uetq.push("consent", "default", { ad_storage: w.__ckyUetSignal });

  const script = document.createElement("script");
  script.id = SCRIPT_ID;
  script.async = true;
  script.src = BAT_JS;
  script.addEventListener(
    "load",
    () => {
      if (!w.UET) return;
      w.uetq = new w.UET({
        ti: tagId,
        enableAutoSpaTracking: opts.autoSpaTracking,
        enableAutoConsent: false,
        q: w.uetq,
      });
      w.uetq.push("pageLoad");
    },
    { once: true },
  );
  devTrackScript(script);
  document.head.appendChild(script);
  return script;
}

/**
 * Withdrawal: Microsoft's signal first, then the kill switch, then cleanup.
 * `update denied` alone keeps the tag sending cookieless beacons, which is what
 * `"advanced"` mode wants; `silent` adds the switch for everything else.
 */
function deny(silent: boolean): void {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  signal("denied");
  if (silent) setDoNotSend(true);
  for (const name of UET_COOKIES) {
    deleteCookie(name);
    try {
      localStorage.removeItem(name);
      localStorage.removeItem(`${name}_exp`);
    } catch {
      // Storage can throw (private mode / disabled): non-fatal.
    }
  }
}

/** Re-grant: lift the kill switch, then tell UET it may track again. */
function allow(): void {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  setDoNotSend(false);
  signal("granted");
}

/**
 * Microsoft's switch is a cookie the tag reads once, when it is built. For a tag
 * already running we also flip the config flag it keeps that value in; every
 * beacon path checks it (checked in bat.js in November 2026, see
 * contributing/design/vendor-runtime-behaviour.md). If that flag ever goes, the
 * cookie still silences the next page load, and `update denied` has been sent.
 */
function setDoNotSend(on: boolean): void {
  if (on) document.cookie = `${DNS_COOKIE}=1; path=/; max-age=31536000; SameSite=Lax`;
  else deleteCookie(DNS_COOKIE);
  const uetq = (window as WindowWithUet).uetq;
  if (uetq && !Array.isArray(uetq) && uetq.uetConfig) uetq.uetConfig.msDns = on;
}

let warned = false;
/** Dev-only, once per page: a helper call went nowhere because UET is not on the page. */
function warnDropped(): void {
  if (process.env.NODE_ENV !== "production" && !warned) {
    warned = true;
    console.warn(
      "[cookieyes] Microsoft UET call dropped: UET is not on the page. In basic mode that " +
        "means the visitor has not granted its category, or has withdrawn it.",
    );
  }
}

let noted = false;
/** Dev-only, once per page: advanced mode sends data before consent, so say so. */
function noteAdvancedMode(): void {
  if (process.env.NODE_ENV !== "production" && !noted) {
    noted = true;
    console.info(
      "[cookieyes] microsoftUet is in advanced mode: UET loads before consent and sends " +
        "cookieless beacons to Microsoft. See the Consent modes section of the Microsoft " +
        "Advertising docs page for what Microsoft receives.",
    );
  }
}

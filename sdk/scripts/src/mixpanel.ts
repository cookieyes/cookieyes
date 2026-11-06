import type { Integration, SilenceControl } from "@cookieyes/core";
import { deleteCookie } from "./cookies.js";
import { devTrackScript } from "./dev-queue.js";

/** Declared locally so the guard survives as a literal; see core's `deprecations.ts`. */
declare const process: { env: { NODE_ENV?: string } };

/** Mixpanel data residency: sets `api_host`. Use `apiHost` instead for a proxy. */
export type MixpanelRegion = "us" | "eu" | "in";

export type MixpanelConfig = {
  /** Your project token: 32 hexadecimal characters, from Project Settings in Mixpanel. Public by design. */
  token: string;
  /**
   * What rejecting consent means. Default `"stop"`.
   * - `"stop"`: nothing loads until the category is granted. On withdrawal Mixpanel is
   *   told to opt out, and its cookie, storage and unsent events are removed.
   * - `"silence"`: Mixpanel loads on every page, opted out, so direct calls and feature
   *   flags work before consent. Its script is downloaded and a localStorage marker and
   *   tab ids are written before any decision. A grant opts in, a withdrawal opts out.
   */
  onReject?: "stop" | "silence" | undefined;
  /** Where your project stores data; sets `api_host`. Default `"us"`. Ignored when `apiHost` is set. */
  region?: MixpanelRegion | undefined;
  /** Explicit `api_host` for a proxy. Overrides `region`. */
  apiHost?: string | undefined;
  /**
   * Mixpanel's `track_pageview`. Default `"url-with-path"`, so route changes in a
   * single-page app count as page views. `false` sends no page views.
   */
  trackPageViews?:
    | boolean
    | "url-with-path"
    | "url-with-path-and-query-string"
    | "full-url"
    | undefined;
  /**
   * On withdrawal, delete the identified user's Mixpanel profile and clear their
   * charges, which is Mixpanel's own default (`delete_user`). **Irreversible.** It
   * deletes the profile, not the user's past events, and it happens every time a
   * logged-in user turns analytics off. Does nothing when nobody has been identified.
   * Default `true`.
   */
  deleteProfileOnWithdraw?: boolean | undefined;
  /**
   * Mixpanel's own `init` settings, applied over `region`, `apiHost` and
   * `trackPageViews`. In `"silence"` mode the two opt-out defaults cannot be overridden.
   */
  initOptions?: Record<string, unknown> | undefined;
  /** Consent category that gates it. Default `"analytics"`. */
  category?: string | undefined;
  /** Override the integration id (only needed if you run more than one). Default `"mixpanel"`. */
  id?: string | undefined;
};

export type MixpanelSyncConfig = {
  /** See {@link MixpanelConfig.deleteProfileOnWithdraw}. Default `true`, Mixpanel's own. */
  deleteProfileOnWithdraw?: boolean | undefined;
  /** Consent category that gates it. Default `"analytics"`. */
  category?: string | undefined;
  /** Override the integration id (only needed if you run more than one). Default `"mixpanel"`. */
  id?: string | undefined;
};

/** Properties for {@link mixpanelTrack}, {@link mixpanelRegister} and {@link mixpanelPeopleSet}. */
export type MixpanelProperties = Record<string, unknown>;

/**
 * Mixpanel (`mixpanel-browser`), consent-gated. Two setup styles:
 *
 * - {@link mixpanel} loads Mixpanel for you from a project token.
 * - {@link mixpanelSync} keeps consent in sync with a Mixpanel you already load yourself.
 *
 * Consent is driven only by CookieYes's own record. Mixpanel's stored opt-in flag is
 * read for one thing: not sending a second `$opt_in` event to a visitor who is already
 * opted in.
 *
 * Withdrawal silences Mixpanel in place: `opt_out_tracking()` stops events, drops the
 * unsent queue and deletes its cookie, and the integration removes what it leaves
 * behind. The script is never removed and loaded again, because the first copy keeps
 * its route-change listener and the two copies share one opt-in flag, so every page
 * view would be counted twice (checked in November 2026, see
 * contributing/design/vendor-runtime-behaviour.md). A re-grant calls `reset()` for a
 * fresh identity, then `opt_in_tracking()`.
 *
 * Send calls with {@link mixpanelTrack} and the other helpers; they do nothing before
 * consent and while it is withdrawn.
 *
 * @example
 * initCookieYes({ mode: "cookie-only", integrations: [mixpanel({ token: "…" })] });
 */
export function mixpanel(config: MixpanelConfig): Integration {
  const token = config.token.trim();
  const silent = config.onReject === "silence";
  const deleteUser = config.deleteProfileOnWithdraw ?? true;
  const initConfig: Record<string, unknown> = {
    api_host: config.apiHost ?? HOSTS[config.region ?? "us"],
    track_pageview: config.trackPageViews ?? "url-with-path",
    ...config.initOptions,
  };
  if (silent) {
    initConfig.opt_out_tracking_by_default = true;
    initConfig.opt_out_persistence_by_default = true;
  }
  return {
    id: config.id ?? "mixpanel",
    category: config.category ?? "analytics",
    version: 1,
    load: silent ? "immediately" : "afterConsent",
    onRevoke: "silence",
    setup: (ctx) =>
      new Promise<SilenceControl>((resolve, reject) => {
        const control: SilenceControl = { silence: () => optOut(deleteUser), resume: optIn };
        if (typeof window === "undefined" || typeof document === "undefined") {
          resolve(control);
          return;
        }
        if (!TOKEN.test(token)) {
          console.error(
            "[cookieyes] mixpanel: token must be 32 hexadecimal characters, so Mixpanel will not load.",
          );
          resolve(control);
          return;
        }
        const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
        if (existing?.dataset.ckyLoaded === "true") {
          // A restart with Mixpanel already on the page: the previous runner opted it
          // out on teardown, so tell it where consent stands now.
          if (ctx.granted()) optIn();
          else optOut(deleteUser);
          resolve(control);
          return;
        }
        if (!existing && !silent) {
          // A stale "opted out" marker from an earlier withdrawal would make a fresh
          // start silently drop every event. It is only read when the script starts.
          deleteCookie(`${OPT_KEY}${token}`);
          removeLocal(`${OPT_KEY}${token}`);
        }
        const script = existing ?? inject(token, initConfig);
        if (silent && !ctx.granted()) noteSilenceMode();
        script.addEventListener(
          "load",
          () => {
            script.dataset.ckyLoaded = "true";
            if (ctx.granted()) {
              // Stop mode starts opted in by itself; silence mode needs the opt-in call.
              if (silent) optIn();
              else allowed = true;
            }
            resolve(control);
          },
          { once: true },
        );
        script.addEventListener(
          "error",
          () => {
            // Undo this attempt so a retry builds the queue and inits once, not twice.
            script.remove();
            const w = window as WindowWithMixpanel;
            if (Array.isArray(w.mixpanel)) delete w.mixpanel;
            reject(new Error("Mixpanel (mixpanel-2-latest.min.js) failed to load"));
          },
          { once: true },
        );
      }),
  };
}

/**
 * Keep consent in sync with a Mixpanel you already load and `init` yourself; we
 * inject nothing. On grant we call `opt_in_tracking()` (with `reset()` first after a
 * withdrawal), on withdrawal `opt_out_tracking()` plus the same cleanup as
 * {@link mixpanel}.
 *
 * **Init opted out**, or Mixpanel tracks from the moment it loads, before consent: pass
 * `opt_out_tracking_by_default: true` and `opt_out_persistence_by_default: true` in
 * your own `init`. Initialise Mixpanel before `initCookieYes` runs.
 *
 * @example
 * initCookieYes({ mode: "cookie-only", integrations: [mixpanelSync()] });
 */
export function mixpanelSync(config: MixpanelSyncConfig = {}): Integration {
  const deleteUser = config.deleteProfileOnWithdraw ?? true;
  return {
    id: config.id ?? "mixpanel",
    category: config.category ?? "analytics",
    version: 1,
    load: "immediately",
    onRevoke: "silence",
    setup: (ctx) => {
      if (ctx.granted()) optIn();
      return { silence: () => optOut(deleteUser), resume: optIn };
    },
  };
}

/** Send an event, for example `mixpanelTrack("signup", { plan: "pro" })`. Does nothing before consent or after a withdrawal. */
export function mixpanelTrack(event: string, properties?: MixpanelProperties): void {
  const mp = live();
  if (!mp) return;
  mp.track(event, properties);
}

/**
 * Tie this visitor's events to your own user id (`mixpanel.identify`). The id is
 * personal data: pass it only for a user who is logged in. Same consent rules as
 * {@link mixpanelTrack}.
 */
export function mixpanelIdentify(userId: string): void {
  const mp = live();
  if (!mp) return;
  mp.identify(userId);
}

/**
 * Set properties on the identified user's profile (`mixpanel.people.set`). These
 * values are personal data: pass only what the user gave you. Same consent rules as
 * {@link mixpanelTrack}.
 */
export function mixpanelPeopleSet(properties: MixpanelProperties): void {
  const mp = live();
  if (!mp) return;
  mp.people.set(properties);
}

/** Set super properties sent with every later event (`mixpanel.register`). Same consent rules as {@link mixpanelTrack}. */
export function mixpanelRegister(properties: MixpanelProperties): void {
  const mp = live();
  if (!mp) return;
  mp.register(properties);
}

/** Forget the identified user and start a new anonymous identity (`mixpanel.reset`), for example on logout. Same consent rules as {@link mixpanelTrack}. */
export function mixpanelReset(): void {
  const mp = live();
  if (!mp) return;
  mp.reset();
}

const SCRIPT_ID = "cky-mixpanel";
const LIB = "https://cdn.mxpnl.com/libs/mixpanel-2-latest.min.js";
const TOKEN = /^[0-9a-f]{32}$/i;
const HOSTS: Record<MixpanelRegion, string> = {
  us: "https://api-js.mixpanel.com",
  eu: "https://api-eu.mixpanel.com",
  in: "https://api-in.mixpanel.com",
};
/** Mixpanel's stored opt-in/out flag, `__mp_opt_in_out_<token>`, in localStorage by default. */
const OPT_KEY = "__mp_opt_in_out_";
/** Mixpanel's IndexedDB database, used for the send queue and session replay data. */
const DB_NAME = "mixpanelBrowserDb";
/** The methods Mixpanel's snippet defers onto the queue until the library has loaded. */
const METHODS =
  "disable time_event track track_pageview track_links track_forms track_with_groups add_group set_group remove_group register register_once alias unregister identify name_tag set_config reset opt_in_tracking opt_out_tracking has_opted_in_tracking has_opted_out_tracking clear_opt_in_out_tracking start_batch_senders start_session_recording stop_session_recording get_session_recording_properties get_session_replay_url people.set people.set_once people.unset people.increment people.append people.union people.track_charge people.clear_charges people.delete_user people.remove".split(
    " ",
  );

type Method = (...args: unknown[]) => unknown;
/** The loaded library, or the queue it replaces (an array with the same method names). */
type MixpanelLike = {
  track: Method;
  identify: Method;
  register: Method;
  reset: Method;
  people: { set: Method };
  opt_in_tracking: Method;
  opt_out_tracking: Method;
  has_opted_in_tracking: Method;
  stop_batch_senders?: Method | undefined;
  get_config?: Method | undefined;
};
type MixpanelStub = unknown[] &
  MixpanelLike & {
    __SV?: number | undefined;
    _i?: unknown[] | undefined;
    init?: ((token: string, config?: Record<string, unknown>, name?: string) => void) | undefined;
  };
type WindowWithMixpanel = Window &
  typeof globalThis & { mixpanel?: MixpanelStub | MixpanelLike | undefined };

/** Build the queue the way Mixpanel's snippet does; the library replays `_i` and the queued calls when it loads. */
function makeStub(): MixpanelStub {
  const mp = [] as unknown as MixpanelStub;
  mp._i = [];
  mp.init = (token, config, name) => {
    let instance = mp as unknown as Record<string, unknown>;
    let instanceName = name;
    if (instanceName !== undefined) {
      instance = (mp as unknown as Record<string, unknown>)[instanceName] = [] as unknown as Record<
        string,
        unknown
      >;
    } else instanceName = "mixpanel";
    instance.people ??= [];
    for (const method of METHODS) {
      const [head, tail] = method.split(".");
      const target = (tail ? instance[head as string] : instance) as unknown[] &
        Record<string, unknown>;
      const key = tail ?? (head as string);
      target[key] = (...args: unknown[]) => {
        target.push([key, ...args]);
      };
    }
    mp._i?.push([token, config, instanceName]);
  };
  mp.__SV = 1.2;
  return mp;
}

/** Create the queue, `init` the project and add the library with our own `<script>` tag so the load can be awaited. */
function inject(token: string, initConfig: Record<string, unknown>): HTMLScriptElement {
  const w = window as WindowWithMixpanel;
  const existing = w.mixpanel;
  const stub = existing && Array.isArray(existing) && existing.__SV ? existing : makeStub();
  w.mixpanel = stub;
  stub.init?.(token, initConfig);

  const script = document.createElement("script");
  script.id = SCRIPT_ID;
  script.async = true;
  script.src = LIB;
  devTrackScript(script);
  document.head.appendChild(script);
  return script;
}

/** Set while consent is granted, so the helpers know when to drop a call. */
let allowed = false;

/** The loaded library, once consent is granted and the script has replaced the queue. */
function loaded(): MixpanelLike | undefined {
  if (typeof window === "undefined") return undefined;
  const mp = (window as WindowWithMixpanel).mixpanel;
  return mp && !Array.isArray(mp) ? mp : undefined;
}

/**
 * Grant: `reset()` for a fresh identity (it also drops anything `identify()` or
 * `register()` stored in memory before consent), then `opt_in_tracking()`, which sends
 * Mixpanel's `$opt_in` event. A visitor Mixpanel already has as opted in, from an
 * earlier grant, is left alone so the event is not sent again on every page.
 */
function optIn(): void {
  allowed = true;
  const mp = loaded();
  if (!mp || mp.has_opted_in_tracking()) return;
  mp.reset();
  mp.opt_in_tracking();
}

/**
 * Withdrawal: Mixpanel's own switch first, then the leftovers. Batching is stopped
 * before the opt-out so that an unsent event is dropped and the profile deletion
 * (`delete_user`) goes out at once instead of waiting in a queue nothing will flush.
 * The opt-out marker itself stays: deleting it while the library is on the page turns
 * tracking back on.
 */
function optOut(deleteUser: boolean): void {
  allowed = false;
  if (typeof window === "undefined" || typeof document === "undefined") return;
  const w = window as WindowWithMixpanel;
  const mp = w.mixpanel;
  if (!mp) return;
  const token = (mp.get_config?.("token") as string | undefined) ?? "";
  mp.stop_batch_senders?.();
  mp.opt_out_tracking({ delete_user: deleteUser });
  if (!token) return;
  deleteCookie(`mp_${token}_mixpanel`);
  deleteCookie("mp_optout");
  removeLocal(`mp_${token}_mixpanel`);
  for (const suffix of ["_ev", "_pp", "_gr"]) removeLocal(`__mpq_${token}${suffix}`);
  try {
    sessionStorage.removeItem(`mp_tab_id_mixpanel_${token}`);
    sessionStorage.removeItem(`mp_gen_new_tab_id_mixpanel_${token}`);
    indexedDB.deleteDatabase(DB_NAME);
  } catch {
    // Storage can throw (private mode / disabled): non-fatal.
  }
}

function removeLocal(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // localStorage can throw (private mode / disabled): non-fatal.
  }
}

/** Mixpanel, when a helper may use it: on the page, loaded or still queueing, and consent granted. */
function live(): MixpanelLike | undefined {
  const mp = typeof window !== "undefined" ? (window as WindowWithMixpanel).mixpanel : undefined;
  if (!mp || !allowed) {
    warnDropped();
    return undefined;
  }
  return mp;
}

let warned = false;
/** Dev-only, once per page: a helper call went nowhere. */
function warnDropped(): void {
  if (process.env.NODE_ENV !== "production" && !warned) {
    warned = true;
    console.warn(
      "[cookieyes] Mixpanel call dropped: the visitor has not granted its category, or has " +
        "withdrawn it. Calls outside consent are not queued.",
    );
  }
}

let noted = false;
/** Dev-only, once per page: silence mode touches the browser before consent, so say so. */
function noteSilenceMode(): void {
  if (process.env.NODE_ENV !== "production" && !noted) {
    noted = true;
    console.info(
      "[cookieyes] mixpanel is in silence mode: Mixpanel's script loads before consent, opted " +
        "out. See the Mixpanel docs page for what reaches Mixpanel and the browser before a decision.",
    );
  }
}

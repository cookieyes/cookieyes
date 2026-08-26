import type { Cleanup, Integration, SilenceControl } from "@cookieyes/core";
import { deleteCookie } from "./cookies.js";
import { safeCall } from "./safe-call.js";

/** PostHog Cloud region — sets the `api_host`. Use `apiHost` instead for self-hosted. */
export type PostHogRegion = "us" | "eu";

export type PostHogConfig = {
  /** Your PostHog project API key (`phc_…`). Public by design — safe in browser code. */
  apiKey: string;
  /**
   * What rejecting consent means — **required, no default**, because it's a legal
   * choice only you can make (PostHog's own default keeps tracking after a "no"):
   * - `"stop"`: nothing loads until consent; on withdrawal PostHog and its data are removed.
   * - `"anonymous"`: keep counting visits **cookie-free** (server-side hash) when consent
   *   is absent or withdrawn. Requires "Cookieless" enabled in your PostHog project settings.
   */
  onReject: "stop" | "anonymous";
  /** PostHog Cloud region → `api_host`. Default `"us"`. Ignored when `apiHost` is set. */
  region?: PostHogRegion;
  /** Explicit `api_host` for self-hosted / reverse-proxied PostHog. Overrides `region`. */
  apiHost?: string;
  /** Consent category that gates it. Default `"analytics"`. */
  category?: string;
  /** Override the integration id (only needed if you run more than one). Default `"posthog"`. */
  id?: string;
};

export type PostHogSyncConfig = {
  /** Consent category that gates it. Default `"analytics"`. */
  category?: string;
  /** Override the integration id (only needed if you run more than one). Default `"posthog"`. */
  id?: string;
};

const HOSTS: Record<PostHogRegion, string> = {
  us: "https://us.i.posthog.com",
  eu: "https://eu.i.posthog.com",
};
const SCRIPT_ID = "cky-posthog";

function warn(message: string): void {
  if (typeof console !== "undefined") console.warn(`[cookieyes] ${message}`);
}

/** Coerce `onReject`. Missing/invalid (a plain-JS caller) → warn and fail safe to `"stop"`. */
function resolveOnReject(value: unknown): "stop" | "anonymous" {
  if (value === "stop" || value === "anonymous") return value;
  warn(
    'posthog(): `onReject` is required — choose "stop" (no tracking without consent) or ' +
      '"anonymous" (cookie-free tracking on reject). Falling back to "stop".',
  );
  return "stop";
}

/**
 * PostHog (`posthog-js`), consent-gated. Two setup styles:
 *
 * - {@link posthog} loads PostHog for you from a project API key.
 * - {@link posthogSync} keeps consent in sync with a PostHog you already load yourself.
 *
 * Whichever you pick, consent is driven only by CookieYes's own record — never by
 * PostHog's `has_opted_*` check, which has a known bug that can report "already
 * decided" when nobody has.
 *
 * @example
 * initCookieYes({
 *   mode: "cookie-only",
 *   integrations: [posthog({ apiKey: "phc_…", onReject: "stop" })],
 * });
 */
export function posthog(config: PostHogConfig): Integration {
  const id = config.id ?? "posthog";
  const category = config.category ?? "analytics";
  const apiHost = config.apiHost ?? HOSTS[config.region ?? "us"];
  const mode = resolveOnReject(config.onReject);

  const initConfig: Record<string, unknown> = {
    api_host: apiHost,
    person_profiles: "identified_only",
  };
  // "anonymous" boots opted-out and cookie-free on its own; opting in on grant
  // (below) upgrades it to normal, cookie-based tracking.
  if (mode === "anonymous") initConfig.cookieless_mode = "on_reject";

  if (mode === "stop") {
    return {
      id,
      category,
      version: 1,
      load: "afterConsent",
      onRevoke: "remove",
      setup: () =>
        waitForLoad(config.apiKey, initConfig, false).then(
          (): Cleanup => () => removePosthog(config.apiKey),
        ),
    };
  }

  return {
    id,
    category,
    version: 1,
    load: "immediately",
    onRevoke: "silence",
    setup: (ctx) =>
      waitForLoad(config.apiKey, initConfig, ctx.granted()).then(
        (): SilenceControl => ({
          silence: () => safeCall("posthog", "opt_out_capturing"),
          resume: () => safeCall("posthog", "opt_in_capturing"),
        }),
      ),
  };
}

/**
 * Keep consent in sync with a PostHog you already load and `init` yourself — we
 * inject nothing. On withdrawal we call `posthog.opt_out_capturing()`; on grant,
 * `posthog.opt_in_capturing()`. Whether "opted out" means fully stopped or
 * cookie-free depends on your own `init` (set `cookieless_mode: "on_reject"` there
 * for the anonymous behaviour). Initialise PostHog before `initCookieYes` runs.
 *
 * @example
 * initCookieYes({ mode: "cookie-only", integrations: [posthogSync()] });
 */
export function posthogSync(config: PostHogSyncConfig = {}): Integration {
  return {
    id: config.id ?? "posthog",
    category: config.category ?? "analytics",
    version: 1,
    load: "immediately",
    onRevoke: "silence",
    setup: (ctx) => {
      if (ctx.granted()) safeCall("posthog", "opt_in_capturing");
      return {
        silence: () => safeCall("posthog", "opt_out_capturing"),
        resume: () => safeCall("posthog", "opt_in_capturing"),
      };
    },
  };
}

// PostHog's official snippet methods — defined on the stub so calls made before
// `array.js` loads are queued and replayed once it does.
const METHODS =
  "init capture register register_once register_for_session unregister unregister_for_session getFeatureFlag getFeatureFlagPayload isFeatureEnabled reloadFeatureFlags updateEarlyAccessFeatureEnrollment getEarlyAccessFeatures on onFeatureFlags onSessionId getSurveys getActiveMatchingSurveys renderSurvey canRenderSurvey identify setPersonProperties group resetGroups setPersonPropertiesForFlags resetPersonPropertiesForFlags setGroupPropertiesForFlags resetGroupPropertiesForFlags reset get_distinct_id getGroups get_session_id get_session_replay_url alias set_config startSessionRecording stopSessionRecording sessionRecordingStarted captureException loadToolbar get_property getSessionProperty createPersonProfile opt_in_capturing opt_out_capturing has_opted_in_capturing has_opted_out_capturing clear_opt_in_out_capturing debug getPageViewId".split(
    " ",
  );

// The `window.posthog` stub: an array that queues method calls until `array.js`
// loads and replays them. A faithful port of PostHog's official snippet.
type PosthogArray = unknown[] & {
  __SV?: number;
  _i?: unknown[];
  init?: (token: string, config?: Record<string, unknown>, name?: string) => void;
  [key: string]: unknown;
};
type WindowWithPosthog = Window &
  typeof globalThis & { posthog?: PosthogArray | undefined; __ckyPosthogInit?: Set<string> };

/** Install PostHog's stub methods + `init` onto the array (matches `array.js`'s replay contract). */
function makeStub(ph: PosthogArray): void {
  ph._i = [];
  ph.init = (token, initConfig, name) => {
    const define = (target: PosthogArray, method: string) => {
      const parts = method.split(".");
      let obj = target;
      let key = method;
      if (parts.length === 2) {
        obj = target[parts[0] as string] as PosthogArray;
        key = parts[1] as string;
      }
      obj[key] = (...args: unknown[]) => {
        obj.push([key, ...args]);
      };
    };
    let instance = ph;
    let instanceName = name;
    if (instanceName !== undefined) instance = ph[instanceName] = [] as unknown as PosthogArray;
    else instanceName = "posthog";
    instance.people = instance.people ?? [];
    for (const method of METHODS) define(instance, method);
    (ph._i as unknown[]).push([token, initConfig, instanceName]);
  };
  ph.__SV = 1;
}

/** `array.js` lives on the `-assets` host for PostHog Cloud, or under a self-hosted `api_host`. */
function arrayJsUrl(apiHost: string): string {
  const assets = apiHost.includes(".i.posthog.com")
    ? apiHost.replace(".i.posthog.com", "-assets.i.posthog.com")
    : apiHost;
  return `${assets.replace(/\/$/, "")}/static/array.js`;
}

/**
 * Ensure the `window.posthog` stub exists (idempotent), `init` once per key, and
 * put `array.js` on the page. Returns the `<script>` element (or `null` in SSR).
 * Re-injects the script if a prior load failed — without re-queuing `init`.
 */
function ensurePosthog(
  apiKey: string,
  initConfig: Record<string, unknown>,
  optIn: boolean,
): HTMLScriptElement | null {
  if (typeof window === "undefined" || typeof document === "undefined") return null;
  const w = window as WindowWithPosthog;

  let ph = w.posthog;
  if (!ph?.__SV) {
    ph = ph ?? ([] as unknown as PosthogArray);
    w.posthog = ph;
    makeStub(ph);
  }

  const inited = (w.__ckyPosthogInit ??= new Set<string>());
  if (!inited.has(apiKey)) {
    inited.add(apiKey);
    ph.init?.(apiKey, initConfig);
    // A returning, already-granted visitor: the engine leaves an immediately-loaded
    // integration "active" without calling resume(), so opt in here.
    if (optIn) safeCall("posthog", "opt_in_capturing");
  }

  const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
  if (existing) return existing;
  const script = document.createElement("script");
  script.id = SCRIPT_ID;
  script.async = true;
  script.src = arrayJsUrl(initConfig.api_host as string);
  document.head.appendChild(script);
  return script;
}

/** Resolve once `array.js` has actually loaded (rejects if it fails), so status is truthful. */
function waitForLoad(
  apiKey: string,
  initConfig: Record<string, unknown>,
  optIn: boolean,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const script = ensurePosthog(apiKey, initConfig, optIn);
    if (!script || script.dataset.ckyLoaded === "true") {
      resolve(); // no DOM (SSR), or already loaded
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
        script.remove(); // remove so a retry re-injects
        reject(new Error("PostHog (array.js) failed to load"));
      },
      { once: true },
    );
  });
}

/**
 * Remove PostHog on withdrawal ("stop" mode): drop the script and stub, and clear
 * its stored data — the main persistence *and* the opt-out preference key, so a
 * later re-grant starts clean instead of inheriting a stale "opted out".
 *
 * Order matters: opt out *first* so PostHog stops its own persistence timer —
 * otherwise the still-running instance rewrites its cookie right after we clear it.
 */
function removePosthog(apiKey: string): void {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  const w = window as WindowWithPosthog;
  safeCall("posthog", "opt_out_capturing"); // stop capturing + persistence before we clear
  document.getElementById(SCRIPT_ID)?.remove();
  w.__ckyPosthogInit?.delete(apiKey); // allow a fresh init on re-grant
  w.posthog = undefined;

  const cookie = `ph_${apiKey}_posthog`;
  deleteCookie(cookie);
  for (const key of [cookie, `__ph_opt_in_out_${apiKey}`]) {
    try {
      window.localStorage?.removeItem(key);
    } catch {
      // localStorage can throw (private mode / disabled) — non-fatal.
    }
  }
}

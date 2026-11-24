import {
  type ConsentSnapshot,
  type CookieYesConfig,
  type RegionConfig,
  type RegionDecision,
  type Regulation,
  resolveRegion,
} from "@cookieyes/core";
import { onMount, setContext } from "svelte";
import { _isServerFirst } from "../hooks/server-first.js";
import { _LIVE_KEY, _REGION_KEY, _RUNTIME_KEY, _SSR_CONSENT_KEY } from "../keys.js";
import { _createRuntime, _tryGetCookieYes, type CookieYesRuntime } from "../runtime.js";

/** Declared locally: see the identical note in `runtime.ts`. */
declare const process: { env: { NODE_ENV?: string } };

type DevQueueEntry = { k: string; t: number; d: unknown };
type DevGlobal = typeof globalThis & { __COOKIEYES_DEVTOOLS__?: DevQueueEntry[] & { v?: number } };

/** What `<CookieYesProvider>` reads from its props; each is read again whenever it changes. */
export type ProviderInputs = {
  region?: RegionConfig | undefined;
  regulation?: Regulation | undefined;
  initialConsent?: ConsentSnapshot | null | undefined;
  forcedRegion?: string | undefined;
};

/**
 * Dev-only `forceRegion` reader, client side. Duplicated from `runtime.ts` on purpose: a plain,
 * unexported, single-call-site function is removed by the same dead-code pass that removes its
 * guarded caller in production, where a shared reference risks surviving.
 */
function readForcedRegion(): string | undefined {
  if (typeof document !== "undefined") {
    const match = /(?:^|;\s*)__cyd_region=([^;]*)/.exec(document.cookie);
    if (match?.[1]) {
      try {
        return decodeURIComponent(match[1]);
      } catch {
        // A malformed cookie value is ignored rather than breaking render.
        return undefined;
      }
    }
  }
  if (typeof window !== "undefined") {
    try {
      return window.localStorage.getItem("__cyd_region") ?? undefined;
    } catch {
      return undefined;
    }
  }
  return undefined;
}

function decide(
  region: RegionConfig | undefined,
  regulation: Regulation | undefined,
  forcedRegion: string | undefined,
): RegionDecision {
  if (region) return resolveRegion(region, regulation, forcedRegion);
  return {
    region: undefined,
    regulation: regulation ?? "DEFAULT",
    source: "manual",
    confidence: "high",
  };
}

/**
 * Reuses the running runtime when the config object is the same one: a server renders per
 * request, so the provider runs per request and must not rebuild the manager each time.
 */
function acquire(config: CookieYesConfig): CookieYesRuntime {
  const existing = _tryGetCookieYes();
  if (existing && existing.config === config) return existing;
  // Only in a browser: a server render written with an inline config object runs once per
  // request, and a warning there would repeat on every request.
  if (existing && typeof document !== "undefined") {
    console.warn(
      "[cookieyes] <CookieYesProvider> ran again with a different config. Replacing the previous runtime.",
    );
  }
  return _createRuntime(config);
}

/**
 * @internal Starts or reuses the runtime and provides it, the resolved region, a returning
 * visitor's consent and the `live` flag to everything below. Run during component
 * initialisation.
 */
export function _setupProvider(config: CookieYesConfig, inputs: () => ProviderInputs): void {
  const runtime = acquire(config);

  // The browser's own override cookie is read only once live: reading it during the first
  // client render would render a different banner than the server did.
  let live = $state(!_isServerFirst());
  onMount(() => {
    live = true;
  });

  const decision = $derived.by(() => {
    const { region = config.region, regulation, forcedRegion } = inputs();
    const forced =
      process.env.NODE_ENV !== "production"
        ? live
          ? (forcedRegion ?? readForcedRegion())
          : forcedRegion
        : undefined;
    return decide(region, regulation ?? config.regulation ?? config.overrides?.regulation, forced);
  });

  setContext(_RUNTIME_KEY, runtime);
  setContext(_REGION_KEY, () => decision);
  setContext(_SSR_CONSENT_KEY, () => inputs().initialConsent ?? null);
  setContext(_LIVE_KEY, () => live);

  // Dev-only devtools instrumentation: the regulation this provider resolved per request is
  // what the banner shows, and it can differ from the runtime's own.
  if (process.env.NODE_ENV !== "production") {
    $effect(() => {
      const q = ((globalThis as DevGlobal).__COOKIEYES_DEVTOOLS__ ??= Object.assign([], {
        v: 1,
      }));
      if (q.length >= 500) q.shift();
      q.push({ k: "p", t: Date.now(), d: decision });
    });
  }
}

import {
  type ConsentSnapshot,
  type RegionConfig,
  type RegionDecision,
  type Regulation,
  resolveRegion,
} from "@cookieyes/core";
import {
  computed,
  defineComponent,
  onMounted,
  type PropType,
  provide,
  shallowRef,
  watchEffect,
} from "vue";
import { _isServerFirst } from "../composables/server-first.js";
import { _REGION_KEY, _SSR_CONSENT_KEY } from "../keys.js";
import type { PartComponent } from "../primitives/utils.js";

/** Declared locally: see the identical note in `runtime.ts`. */
declare const process: { env: { NODE_ENV?: string } };

type DevQueueEntry = { k: string; t: number; d: unknown };
type DevGlobal = typeof globalThis & { __COOKIEYES_DEVTOOLS__?: DevQueueEntry[] & { v?: number } };

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

export type CookieYesProviderProps = {
  /**
   * The same `region` config you pass to the plugin. Resolved per render, so on the server it
   * uses the request's region and the banner is rendered with the correct regulation.
   */
  region?: RegionConfig;
  /** A fixed regulation. When both `region` and `regulation` are given, `regulation` wins. */
  regulation?: Regulation;
  /**
   * A returning visitor's stored consent, read from the request on the server with
   * `readServerConsent()`. With it the banner is never rendered for them, rather than rendered
   * and removed after hydration. It is a prop and not a plugin option because the runtime is
   * shared across concurrent server requests, so per-visitor consent kept there would leak.
   */
  initialConsent?: ConsentSnapshot | null;
  /**
   * Dev-only: a `forceRegion` override already resolved on the server from the request's
   * `__cyd_region` cookie, so the server-rendered banner matches it. Ignored in production.
   */
  forcedRegion?: string | undefined;
};

/**
 * Supplies the resolved regulation and a returning visitor's consent to everything below it, so
 * the server renders the correct banner for each request. Wrap your consent UI with it and pass
 * the same `region` config you give the plugin. It is optional: without it the composables read
 * the runtime.
 */
export const CookieYesProvider: PartComponent<
  CookieYesProviderProps,
  { default?: () => unknown },
  object
> = defineComponent({
  name: "CookieYesProvider",
  props: {
    region: { type: Object as PropType<RegionConfig>, default: undefined },
    regulation: { type: String as PropType<Regulation>, default: undefined },
    initialConsent: { type: Object as PropType<ConsentSnapshot | null>, default: null },
    forcedRegion: { type: String, default: undefined },
  },
  setup(props, { slots }) {
    // The browser's own override cookie is read only once live: reading it during the first
    // client render would render a different banner than the server did.
    const live = shallowRef(!_isServerFirst());
    onMounted(() => {
      live.value = true;
    });

    const decision = computed(() => {
      const forced =
        process.env.NODE_ENV !== "production"
          ? live.value
            ? (props.forcedRegion ?? readForcedRegion())
            : props.forcedRegion
          : undefined;
      return decide(props.region, props.regulation, forced);
    });
    provide(_REGION_KEY, decision);
    provide(
      _SSR_CONSENT_KEY,
      computed(() => props.initialConsent ?? null),
    );

    // Dev-only devtools instrumentation: the regulation this provider resolved per request is
    // what the banner shows, and it can differ from the runtime's own.
    if (process.env.NODE_ENV !== "production") {
      onMounted(() => {
        watchEffect(() => {
          const q = ((globalThis as DevGlobal).__COOKIEYES_DEVTOOLS__ ??= Object.assign([], {
            v: 1,
          }));
          if (q.length >= 500) q.shift();
          q.push({ k: "p", t: Date.now(), d: decision.value });
        });
      });
    }

    return () => slots.default?.();
  },
}) as unknown as PartComponent<CookieYesProviderProps, { default?: () => unknown }, object>;

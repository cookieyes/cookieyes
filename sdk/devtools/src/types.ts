// Type-only imports from @cookieyes/core: zero runtime cost, and these two
// shapes (IntegrationDebugInfo, GoogleConsentSignal) aren't re-exported by
// @cookieyes/react's own barrel. Every *runtime* value the panel touches still
// comes from @cookieyes/react's published entry (see devtools.tsx), matching
// the "no relative cross-package import" rule.
import type {
  ConsentCategory,
  GoogleConsentSignal,
  IntegrationDebugInfo,
  IntegrationStatus,
} from "@cookieyes/core";
import type { RegionConfig, RegionDecision, Regulation } from "@cookieyes/react";

/**
 * These four shapes used to be exported from `@cookieyes/core` (a shared
 * `devtools-hooks.ts` registry module). Under the global-queue contract
 * (`globalThis.__COOKIEYES_DEVTOOLS__`, see `useDevRuntimeData.ts`), core
 * exports nothing devtools-specific at all — these are now local,
 * hand-matched to the `d` payload shape each core/scripts push site puts on
 * the queue (network-blocker.ts's `k: "b"`, google-consent-mode.ts's/
 * scripts's `k: "g"`, integrations.ts's `k: "i"`, manager.ts's `k: "c"`),
 * with the queue entry's top-level `t` reconstructed as `timestamp`.
 */
export type DevBlockedRequestEvent = {
  rule: {
    id: string;
    domain: string;
    pathIncludes?: string | undefined;
    methods?: string[] | undefined;
    category: ConsentCategory;
  };
  url: string;
  method: string;
  timestamp: number;
};

export type DevGcmRecord = {
  signals: Record<GoogleConsentSignal, "granted" | "denied">;
  timestamp: number;
  trigger: "default" | "update";
  source: "bootstrap" | "broadcast" | "server-snippet";
};

export type DevIntegrationEvent = {
  id: string;
  status: IntegrationStatus;
  timestamp: number;
};

export type DevConsentEvent = {
  kind: "save" | "change";
  categories: Record<string, boolean>;
  changedCategories: string[];
  timestamp: number;
};

/** The panel's colour scheme; `"system"` follows the OS (`prefers-color-scheme`). */
export type DevtoolsTheme = "light" | "dark" | "system";

/** Corner the floating trigger docks to. */
export type DevtoolsPosition = "top-left" | "top-right" | "bottom-left" | "bottom-right";

/** One tab of the panel, in display order. */
export type TabId =
  | "consent"
  | "integrations"
  | "blocked"
  | "gcm"
  | "events"
  | "region"
  | "actions";

export const TAB_IDS: readonly TabId[] = [
  "consent",
  "integrations",
  "blocked",
  "gcm",
  "events",
  "region",
  "actions",
];

export const TAB_LABELS: Record<TabId, string> = {
  consent: "Consent",
  integrations: "Integrations",
  blocked: "Blocked",
  gcm: "Consent Mode",
  events: "Events",
  region: "Region",
  actions: "Actions",
};

/** Persisted UI chrome state — see `useDevtoolsUiState`. */
export type DevtoolsUiState = {
  open: boolean;
  activeTab: TabId;
  position: DevtoolsPosition;
};

/** Everything a tab needs to render; produced by `useDevRuntimeData()`. */
export type DevRuntimeData = {
  /**
   * `true` when `globalThis.__COOKIEYES_DEVTOOLS__` exists but its `v`
   * version marker isn't the one this panel understands (or is missing) —
   * e.g. an older/newer SDK build using a different queue-entry shape. The
   * panel renders a warning banner rather than silently misinterpreting
   * entries. `false` once a compatible queue is found (including "no queue
   * yet" — nothing has pushed, which isn't a mismatch).
   */
  queueVersionUnknown: boolean;
  consent: {
    working: Record<string, boolean>;
    committed: Record<string, boolean>;
    hasActed: boolean;
    regulation: Regulation;
  };
  integrations: IntegrationDebugInfo[];
  blockedRequests: DevBlockedRequestEvent[];
  gcm: { current: Record<GoogleConsentSignal, "granted" | "denied">; history: DevGcmRecord[] };
  events: EventRow[];
  region: {
    decision: RegionDecision;
    /** e.g. "x-vercel-ip-country" — undefined when not known client-side, or when forced. */
    drivingSignal: string | undefined;
    forcedRegion: string | undefined;
    /**
     * `true` when an override is set but the SDK would ignore it: `regulation`
     * is pinned manually, or there is no `region` config. Production ignores
     * the region in those cases too, so the panel says so instead of warning.
     */
    forcedRegionIgnored?: boolean | undefined;
    /**
     * The runtime's `region` config and pinned `regulation`, from the queue's
     * `"r"` entry — what the panel previews a forced region against.
     * `undefined` until the runtime has mounted.
     */
    config: { region: RegionConfig | undefined; regulation: Regulation | undefined } | undefined;
  };
};

/**
 * `DevConsentEvent` already has its own `kind: "save" | "change"` field, which
 * would collide with the outer discriminant below (TS would intersect
 * `"consent" & ("save" | "change")` down to `never`) — so it's renamed to
 * `action` here rather than dropped, since "was this a save or a change" is
 * still useful to render.
 */
export type EventRow = (
  | ({ kind: "consent"; action: DevConsentEvent["kind"] } & Omit<DevConsentEvent, "kind">)
  | ({ kind: "integration" } & DevIntegrationEvent)
  | ({ kind: "blocked" } & DevBlockedRequestEvent)
) & {
  /** Recorded before the last page load (restored from sessionStorage). */
  previous?: boolean | undefined;
};

/** Ring-buffer cap for the events/blocked-requests streams the panel renders. */
export const EVENT_CAP = 200;

/**
 * The request header (name + the value it carried) that drove an unforced
 * server-side region decision — the shape `@cookieyes/nextjs/server`'s
 * `getServerRegion()` returns. Declared locally (duck-typed) rather than
 * imported from `@cookieyes/nextjs`: this package has no dependency on
 * `@cookieyes/nextjs` (it targets plain React too), so the shape is
 * structural, not a type import across that boundary.
 */
export type DevtoolsDrivingSignal = { header: string; value: string };

/**
 * What a server helper (`getServerRegion()`) already knows, passed in
 * explicitly by the developer — e.g. `<CookieYesDevtools
 * serverRegion={await getServerRegion()} />` in an RSC layout — because the
 * panel itself (a client component) has no access to the request. Optional:
 * a plain client-only React app has nothing to pass, and the Region tab falls
 * back to disclosing that the signal was "determined in the browser" instead
 * of showing nothing (Story 3.5).
 */
export type DevtoolsServerRegionInfo = {
  region: string | undefined;
  drivingSignal: DevtoolsDrivingSignal | undefined;
  gpc: boolean;
  forcedRegion: string | undefined;
};

export type CookieYesDevtoolsProps = {
  /** Corner the trigger button docks to. Default `"bottom-right"`. */
  position?: DevtoolsPosition | undefined;
  /**
   * The host page's colour scheme, so the panel can match it. Default `"system"`
   * (the OS preference). A Light/Dark choice made in the panel header wins over
   * it and persists; choosing System there follows this prop again.
   */
  theme?: DevtoolsTheme | undefined;
  /**
   * What `@cookieyes/nextjs/server`'s `getServerRegion()` (or an equivalent
   * for another SSR framework) already determined about the request, so the
   * Region tab can show which header/signal actually drove the decision
   * (Story 3.5) instead of leaving it blank. Pass it from a Server Component:
   * `<CookieYesDevtools serverRegion={await getServerRegion()} />`. The stub
   * accepts and ignores the same prop.
   */
  serverRegion?: DevtoolsServerRegionInfo | undefined;
};

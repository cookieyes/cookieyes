"use client";

// `computeGoogleConsent` is a pure function with no I/O or side effects, and
// @cookieyes/react's own barrel does not re-export it (react has no reason to
// — nothing in react itself needs the *current* 7-signal computation, only
// core's broadcast side effect does). Importing it directly from core is the
// one unavoidable exception to "never import core directly for anything react
// already re-exports": there is nothing to re-export from.
import { computeGoogleConsent } from "@cookieyes/core";
import type { CookieYesRuntime, GoogleConsentSignal } from "@cookieyes/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  type DevBlockedRequestEvent,
  type DevConsentEvent,
  type DevGcmRecord,
  type DevIntegrationEvent,
  type DevRuntimeData,
  EVENT_CAP,
  type EventRow,
} from "../types.js";

const GCM_HISTORY_CAP = 50;

/**
 * Events are kept in sessionStorage (per tab) so a flow that reloads the page
 * (a withdrawal with `reloadOnRevoke`, a forced region) keeps its history.
 * Capped lower than the in-memory list: storage is synchronous.
 */
const EVENTS_STORAGE_KEY = "cyd:events";
const STORED_EVENTS_CAP = 100;

function readStoredEvents(): EventRow[] {
  try {
    const raw = window.sessionStorage.getItem(EVENTS_STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as EventRow[]) : [];
    return Array.isArray(parsed) ? parsed.map((e) => ({ ...e, previous: true })) : [];
  } catch {
    return [];
  }
}

function writeStoredEvents(events: EventRow[]): void {
  try {
    window.sessionStorage.setItem(
      EVENTS_STORAGE_KEY,
      JSON.stringify(events.slice(-STORED_EVENTS_CAP)),
    );
  } catch {
    // storage full or disabled: history just won't survive the reload
  }
}

/** The version this build of `@cookieyes/devtools` understands. */
const SUPPORTED_QUEUE_VERSION = 1;

/**
 * The dataLayer/gtag-style global queue every `@cookieyes/core`/
 * `@cookieyes/scripts` instrumentation site pushes onto (see the note at the
 * top of core's `network-blocker.ts`) — a plain array on `globalThis`, not a
 * shared module import, so the main SDK packages never reference anything
 * devtools-specific in production.
 */
type DevQueueEntry = { k: string; t: number; d: unknown };
type DevQueueArray = DevQueueEntry[] & { v?: number };
type DevGlobal = typeof globalThis & { __COOKIEYES_DEVTOOLS__?: DevQueueArray };

function cap<T>(list: T[], max: number): T[] {
  return list.length > max ? list.slice(list.length - max) : list;
}

/** Reconstruct each queue kind's typed shape from `{ k, t, d }`. */
function toBlockedRequestEvent(entry: DevQueueEntry): DevBlockedRequestEvent {
  const d = entry.d as Omit<DevBlockedRequestEvent, "timestamp">;
  return { ...d, timestamp: entry.t };
}
function toGcmRecord(entry: DevQueueEntry): DevGcmRecord {
  const d = entry.d as Omit<DevGcmRecord, "timestamp">;
  return { ...d, timestamp: entry.t };
}
function toIntegrationEvent(entry: DevQueueEntry): DevIntegrationEvent {
  const d = entry.d as Omit<DevIntegrationEvent, "timestamp">;
  return { ...d, timestamp: entry.t };
}
function toConsentEvent(entry: DevQueueEntry): DevConsentEvent {
  const d = entry.d as Omit<DevConsentEvent, "timestamp">;
  return { ...d, timestamp: entry.t };
}

/**
 * AD-3's one deliberate exception to "no scraping": the server-rendered
 * Consent Mode default (`<GoogleConsentMode/>`'s inline script,
 * `bootstrapGoogleConsentMode()`'s runtime-equivalent) runs before this
 * module's queue-reader effect can attach — but it always pushes to
 * `window.dataLayer` too (that's the whole point of a `gtag`-style default),
 * so read that once, on mount, read-only — never patched — to reconstruct
 * it into the same `DevGcmRecord` shape, tagged `"server-snippet"`.
 */
function readServerSnippetGcmRecord(): DevGcmRecord | undefined {
  if (typeof window === "undefined") return undefined;
  const dataLayer = (window as { dataLayer?: unknown[] }).dataLayer;
  if (!Array.isArray(dataLayer)) return undefined;
  for (const entry of dataLayer) {
    const args = Array.isArray(entry)
      ? entry
      : entry && typeof entry === "object" && "length" in (entry as ArrayLike<unknown>)
        ? Array.from(entry as ArrayLike<unknown>)
        : null;
    if (!args) continue;
    if (args[0] !== "consent" || args[1] !== "default") continue;
    const raw = args[2];
    if (!raw || typeof raw !== "object") continue;
    const s = raw as Record<string, unknown>;
    const pick = (key: string, fallback: "granted" | "denied") =>
      s[key] === "granted" || s[key] === "denied" ? (s[key] as "granted" | "denied") : fallback;
    return {
      signals: {
        ad_storage: pick("ad_storage", "denied"),
        ad_user_data: pick("ad_user_data", "denied"),
        ad_personalization: pick("ad_personalization", "denied"),
        analytics_storage: pick("analytics_storage", "denied"),
        functionality_storage: pick("functionality_storage", "denied"),
        personalization_storage: pick("personalization_storage", "denied"),
        security_storage: pick("security_storage", "granted"),
      },
      timestamp: Date.now(),
      trigger: "default",
      source: "server-snippet",
    };
  }
  return undefined;
}

/**
 * Read-only, sourced entirely from `globalThis.__COOKIEYES_DEVTOOLS__` — a
 * gtag/dataLayer-style global queue, not a shared module import (see the
 * design's "option A" note in core's `network-blocker.ts`). On mount, drains
 * whatever was pushed before this hook attached (proving the queue captures
 * pre-mount events, e.g. the earliest GCM default), then wraps `.push` to
 * receive live entries, restoring the original on unmount. Returns `null`
 * until a runtime is mounted — the caller (the panel) renders an empty state.
 */
export function useDevRuntimeData(runtime: CookieYesRuntime | null): {
  data: DevRuntimeData | null;
  clearEvents: () => void;
} {
  const [snapshot, setSnapshot] = useState(() => runtime?.getSnapshot() ?? null);
  const [integrationsTick, setIntegrationsTick] = useState(0);
  const [blockedRequests, setBlockedRequests] = useState<DevBlockedRequestEvent[]>([]);
  const [gcmHistory, setGcmHistory] = useState<DevGcmRecord[]>([]);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [queueVersionUnknown, setQueueVersionUnknown] = useState(false);
  const [regionConfig, setRegionConfig] = useState<DevRuntimeData["region"]["config"]>(undefined);

  useEffect(() => {
    if (!runtime) {
      setSnapshot(null);
      return;
    }
    setSnapshot(runtime.getSnapshot());
    return runtime.subscribe(() => setSnapshot(runtime.getSnapshot()));
  }, [runtime]);

  useEffect(() => {
    if (!runtime) {
      setBlockedRequests([]);
      setGcmHistory([]);
      setEvents([]);
      setQueueVersionUnknown(false);
      return;
    }

    // Ensure a queue exists (a page with devtools mounted but no instrumented
    // event yet still gets one, with the version this panel expects) — and
    // read whatever is already queued, in order.
    const g = globalThis as DevGlobal;
    const queue: DevQueueArray = (g.__COOKIEYES_DEVTOOLS__ ??= Object.assign([], {
      v: SUPPORTED_QUEUE_VERSION,
    }));
    setQueueVersionUnknown(queue.v !== undefined && queue.v !== SUPPORTED_QUEUE_VERSION);

    const serverSnippet = readServerSnippetGcmRecord();
    const initialBlocked: DevBlockedRequestEvent[] = [];
    const initialGcm: DevGcmRecord[] = serverSnippet ? [serverSnippet] : [];
    const initialEvents: EventRow[] = [];

    function apply(entry: DevQueueEntry): void {
      if (entry.k === "b") {
        const event = toBlockedRequestEvent(entry);
        setBlockedRequests((prev) => cap([...prev, event], EVENT_CAP));
        setEvents((prev) => cap([...prev, { kind: "blocked", ...event }], EVENT_CAP));
      } else if (entry.k === "g") {
        const record = toGcmRecord(entry);
        setGcmHistory((prev) => cap([...prev, record], GCM_HISTORY_CAP));
      } else if (entry.k === "i") {
        const event = toIntegrationEvent(entry);
        setIntegrationsTick((n) => n + 1);
        setEvents((prev) => cap([...prev, { kind: "integration", ...event }], EVENT_CAP));
      } else if (entry.k === "r") {
        setRegionConfig(entry.d as DevRuntimeData["region"]["config"]);
      } else if (entry.k === "c") {
        const event = toConsentEvent(entry);
        const { kind: action, ...rest } = event;
        setEvents((prev) =>
          cap([...prev, { kind: "consent" as const, action, ...rest }], EVENT_CAP),
        );
      }
    }

    // Drain entries already queued before this effect attached (the proof
    // that pre-mount events, like an early GCM default, aren't lost).
    for (const entry of queue) {
      if (entry.k === "b") initialBlocked.push(toBlockedRequestEvent(entry));
      else if (entry.k === "g") initialGcm.push(toGcmRecord(entry));
      else if (entry.k === "i")
        initialEvents.push({ kind: "integration", ...toIntegrationEvent(entry) });
      else if (entry.k === "r") setRegionConfig(entry.d as DevRuntimeData["region"]["config"]);
      else if (entry.k === "c") {
        const { kind: action, ...rest } = toConsentEvent(entry);
        initialEvents.push({ kind: "consent", action, ...rest });
      }
    }
    setBlockedRequests(cap(initialBlocked, EVENT_CAP));
    setGcmHistory(cap(initialGcm, GCM_HISTORY_CAP));
    setEvents(cap([...readStoredEvents(), ...initialEvents], EVENT_CAP));

    // Wrap `push` (gtag/dataLayer style) to receive live entries — restore
    // the original on unmount so this hook never leaves the queue patched
    // once the panel is gone.
    const originalPush = queue.push.bind(queue);
    queue.push = ((...items: DevQueueEntry[]) => {
      const result = originalPush(...items);
      for (const item of items) apply(item);
      return result;
    }) as typeof queue.push;

    return () => {
      queue.push = originalPush;
    };
  }, [runtime]);

  // Persist after the first load of history (skip the initial empty state, which
  // would otherwise wipe the stored list before it is read).
  const hydrated = useRef(false);
  useEffect(() => {
    if (!runtime) return;
    if (!hydrated.current) {
      hydrated.current = true;
      return;
    }
    writeStoredEvents(events);
  }, [events, runtime]);

  const clearEvents = useCallback(() => {
    setEvents([]);
    setBlockedRequests([]);
    writeStoredEvents([]);
  }, []);

  const data = useMemo<DevRuntimeData | null>(() => {
    if (!runtime || !snapshot) return null;
    const gcmSignals: Record<GoogleConsentSignal, "granted" | "denied"> = computeGoogleConsent(
      runtime.categories,
      snapshot.committedCategories,
    );
    return {
      queueVersionUnknown,
      consent: {
        working: snapshot.categories,
        committed: snapshot.committedCategories,
        hasActed: snapshot.hasActed,
        regulation: snapshot.regulation,
      },
      // Re-read on every integrationsTick bump — the runner's own list() call
      // is the source of truth; the dev hook only tells us *when* to re-read it.
      integrations: runtime.getIntegrations(),
      blockedRequests,
      gcm: { current: gcmSignals, history: gcmHistory },
      events,
      region: {
        decision: runtime.getRegion(),
        // Not knowable from this hook alone — devtools.tsx overrides this
        // with either the `serverRegion` prop's driving signal or a
        // client-determined fallback label (Story 3.5).
        drivingSignal: undefined,
        forcedRegion:
          runtime.getRegion().source === "forced" ? runtime.getRegion().region : undefined,
        config: regionConfig,
      },
    };
    // `integrationsTick` is a dependency read only for its side effect (it's
    // the signal to re-read `runtime.getIntegrations()`, not itself part of
    // the returned data), which is why it isn't referenced in the body above.
  }, [
    runtime,
    snapshot,
    blockedRequests,
    gcmHistory,
    events,
    integrationsTick,
    queueVersionUnknown,
    regionConfig,
  ]);

  return { data, clearEvents };
}

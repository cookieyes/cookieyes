import {
  type CategoryDef,
  type ConsentCategory,
  type ConsentEventPayload,
  type ConsentEventType,
  type ConsentManager,
  type ConsentSnapshot,
  type CookieYesConfig,
  type ResolvedCategories,
  resolveCategories,
} from "@cookieyes/core";
import { warnOnCoreVersionMismatch } from "./core-version.js";
import { type GoogleConsentUpdate, installDataLayer, readGoogleConsent } from "./google-consent.js";
import { createRecorder, createRecordingBackend, type Recorder } from "./recorders.js";
import { DEFAULT_SEED_REGULATION, prepareConsentCookie } from "./seed.js";
import type {
  ConsentTestBase,
  ConsentTestOptions,
  HarnessSnapshot,
  RecordedConsentEvent,
} from "./types.js";
import { assertKnownCategory } from "./validate.js";

/**
 * Everything both entry points need before an engine exists: the resolved
 * taxonomy, a seeded cookie, the recorders, and the config to hand the engine.
 *
 * `@cookieyes/core` and `@cookieyes/react` take the *same* `CookieYesConfig`, so
 * this is genuinely shared rather than parallel — the only difference downstream
 * is which `initCookieYes` receives it.
 */
export type HarnessSetup = {
  resolved: ResolvedCategories;
  recorder: Recorder;
  ready: Promise<void>;
  config: CookieYesConfig;
  googleConsentMode: boolean;
};

export function setupHarness(options: ConsentTestOptions<readonly CategoryDef[]>): HarnessSetup {
  // Say something before the first assertion runs, not after a
  // developer has spent an afternoon on a test that was never testing their engine.
  warnOnCoreVersionMismatch();

  const declared = options.categories ? [...options.categories] : undefined;
  const resolved = resolveCategories(declared);
  const regulation = options.regulation ?? DEFAULT_SEED_REGULATION;

  // Installs the cookie jar (node only) and writes the seeded state through
  // core's own serializer, before any engine reads it.
  prepareConsentCookie(
    resolved,
    regulation,
    options.initialConsent as Record<string, boolean | undefined> | undefined,
    options.consentId,
  );

  // Must happen before the engine is built: core broadcasts the initial Consent
  // Mode state during `createConsentManager`, so a dataLayer installed later
  // would miss the load-time signal entirely.
  const googleConsentMode = options.googleConsentMode === true;
  if (googleConsentMode) installDataLayer();

  const recorder = createRecorder();

  // Production fires onConsentReady on one microtask — the SDK's only async seam.
  // Capture it so `whenReady()` mirrors that timing instead of inventing its own.
  let markReady: () => void = () => undefined;
  const ready = new Promise<void>((resolve) => {
    markReady = resolve;
  });

  const common = {
    regulation,
    ...(declared ? { categories: declared } : {}),
    ...(options.onConsentUpdate ? { onConsentUpdate: options.onConsentUpdate } : {}),
    onConsentReady: (state: ConsentSnapshot) => {
      markReady();
      options.onConsentReady?.(state);
    },
  };

  // A recording backend is installed for every self-hosted harness, so the real
  // persistence branch runs while nothing reaches the network.
  const config: CookieYesConfig =
    options.mode === "self-hosted"
      ? {
          mode: "self-hosted",
          ...common,
          backend: createRecordingBackend(recorder, options.backend),
        }
      : { mode: "cookie-only", ...common };

  return { resolved, recorder, ready, config, googleConsentMode };
}

/**
 * How one engine plugs into the shared harness. `@cookieyes/core`'s runtime and
 * `@cookieyes/react`'s both expose a real `ConsentManager` and the same event
 * emitter, which is the entire seam needed — so neither entry point reimplements
 * a single consent rule, and the two cannot drift apart from each other either.
 */
export type EngineBinding = {
  manager: ConsentManager;
  on: (
    type: ConsentEventType,
    listener: (payload: ConsentEventPayload) => void,
    options?: { category?: string },
  ) => () => void;
  resolved: ResolvedCategories;
  recorder: Recorder;
  ready: Promise<void>;
  teardown: () => void;
  googleConsentMode: boolean;
  /**
   * Wraps every state mutation. Core passes the callback straight through; React
   * wraps it in `act()` so a mounted component has re-rendered by the time the
   * next assertion runs.
   */
  wrap: (fn: () => void) => void;
};

/** Build the engine-agnostic half of a harness. */
export function createSharedHarness<Id extends string>(engine: EngineBinding): ConsentTestBase<Id> {
  const { manager, recorder, resolved, wrap } = engine;

  function assertKnown(id: string): void {
    assertKnownCategory(id, resolved.ids);
  }

  function record(type: ConsentEventType) {
    return (payload: ConsentEventPayload): void => {
      // Skip the one-off replay a listener gets on attach: `events()` is a log of
      // what the visitor actually did. Use `on()` to observe the replay itself.
      if (payload.isInitial) return;
      recorder.events.push({ type, ...payload });
    };
  }
  engine.on("save", record("save"));
  engine.on("change", record("change"));
  manager.subscribe((state) => {
    recorder.snapshots.push(state);
  });

  /** Set a working value, then commit it — the "developer changes consent" path. */
  function setAndSave(id: string, value: boolean): void {
    assertKnown(id);
    wrap(() => {
      manager.updateCategory(id, value);
      manager.savePreferences();
    });
  }

  function snapshot(): HarnessSnapshot<Id> {
    return {
      consentId: manager.consentId,
      hasActed: manager.hasActed,
      categories: manager.categories,
      regulation: manager.regulation,
      lastRenewed: manager.lastRenewed,
      taxonomyHash: manager.taxonomyHash,
      committed: manager.committedCategories as Record<Id, boolean>,
      live: manager.categories as Record<Id, boolean>,
    };
  }

  return {
    manager,
    // Core types ids as the open `ConsentCategory`; `Id` is the closed union we
    // derived from the caller's own taxonomy, so this narrowing is deliberate.
    categories: resolved.ids as unknown as readonly Id[],

    has(id) {
      assertKnown(id);
      return manager.committedCategories[id] === true;
    },
    snapshot,

    grant(id) {
      setAndSave(id, true);
    },
    deny(id) {
      setAndSave(id, false);
    },
    set(id, value) {
      setAndSave(id, value);
    },
    acceptAll() {
      wrap(() => manager.acceptAll());
    },
    rejectAll() {
      wrap(() => manager.rejectAll());
    },
    withdrawAll() {
      wrap(() => manager.rejectAll());
    },
    acceptOnly(selected) {
      for (const id of selected) assertKnown(id);
      wrap(() => manager.acceptSelected([...selected] as ConsentCategory[]));
    },

    toggle(id, value) {
      assertKnown(id);
      wrap(() => manager.updateCategory(id, value));
    },
    save() {
      wrap(() => manager.savePreferences());
    },

    on(type, listener, opts) {
      if (opts?.category !== undefined) {
        assertKnown(opts.category);
        return engine.on(type, listener, { category: opts.category });
      }
      return engine.on(type, listener);
    },
    subscribe(listener) {
      return manager.subscribe(listener);
    },
    whenReady() {
      return engine.ready;
    },

    events(type): RecordedConsentEvent[] {
      const all = recorder.events;
      return type ? all.filter((event) => event.type === type) : [...all];
    },
    snapshots() {
      return [...recorder.snapshots];
    },
    backendCalls() {
      return [...recorder.backendCalls];
    },
    googleConsent(): GoogleConsentUpdate[] {
      if (!engine.googleConsentMode) {
        throw new Error(
          "[@cookieyes/test] googleConsent() requires `googleConsentMode: true`. " +
            "Core's Consent Mode broadcast is a no-op without a dataLayer, so the " +
            "harness only installs one when you ask for it. Returning an empty " +
            "array here would read like 'nothing was broadcast'.",
        );
      }
      return readGoogleConsent();
    },

    resetVisitor() {
      wrap(() => manager.resetConsent());
    },
    teardown() {
      engine.teardown();
    },
  };
}

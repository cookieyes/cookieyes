import type { ConsentCategory, RegionDecision } from "./types.js";

/**
 * The integration format — the shared contract between the consent engine and
 * every vendor preset (Google, Segment, Meta, …). It carries no vendor
 * knowledge; a preset in `@cookieyes/scripts` fills it in.
 *
 * Two plain axes describe every vendor:
 * - `load`:     when the vendor starts — right away, or only after consent.
 * - `onRevoke`: what happens when consent is withdrawn — one of three modes.
 *
 * `onRevoke` is declarative (readable without running `setup`, so a debug view
 * or a version check can inspect it), and it's a discriminated union so the
 * compiler forces the matching handler — you can't declare `"silence"` with no
 * way to actually silence.
 */
export type Cleanup = () => void;
export type SilenceControl = { silence: () => void; resume: () => void };

/** What a vendor's `setup` receives from the engine. */
export type SetupCtx = {
  /** Is this integration's category currently committed-granted? */
  granted: () => boolean;
  /**
   * Subscribe to committed-consent changes; returns an unsubscribe function.
   * `keep` vendors (e.g. Google Consent Mode) use this to emit their own
   * updates on every change. The engine also releases these automatically when
   * the integration is torn down, so a vendor listener never outlives it.
   */
  onConsentChange: (fn: () => void) => () => void;
  /** Resolved region/regulation — for a vendor's US-state privacy switch. */
  region: RegionDecision;
};

type Base = {
  id: string;
  category: ConsentCategory;
  /** Format version; an unknown version is refused (see {@link runIntegrations}). */
  version: number;
  /**
   * When to start. Note: `setup` always runs on a microtask, so `immediately`
   * is *very early* but not synchronous / same-tick. The truly-first-thing case
   * (Consent Mode's deny-default before any tag fires) is the server `<head>`
   * snippet's job, not the engine's.
   */
  load: "immediately" | "afterConsent";
  /**
   * Reserved for a later slice: queue calls made before the first load and
   * replay them once loaded. Off by default. Not yet acted on by the engine.
   */
  replayAfterConsent?: boolean;
};

export type Integration = Base &
  (
    | { onRevoke: "keep"; setup: (ctx: SetupCtx) => void | Promise<void> }
    | {
        onRevoke: "remove";
        setup: (ctx: SetupCtx) => Cleanup | Promise<Cleanup>;
      }
    | {
        onRevoke: "silence";
        setup: (ctx: SetupCtx) => SilenceControl | Promise<SilenceControl>;
      }
  );

/** The format version this engine understands. Bump on a breaking format change. */
export const INTEGRATION_FORMAT_VERSION = 1;

/**
 * Warn when a vendor is configured on both sides — a new `integrations` preset
 * whose id matches a deprecated `builtInIntegrations` vendor. Both would run,
 * which for a tracker means double-counted events (the DEVP-38 double-pixel).
 * Preset ids are the vendor's canonical name (`"segment"`, `"meta"`, …), which
 * is exactly the built-in vendor name, so the match is a plain id === vendor.
 */
export function warnOverlappingVendors(integrationIds: string[], builtInVendors: string[]): void {
  const ids = new Set(integrationIds);
  for (const vendor of builtInVendors) {
    if (ids.has(vendor)) {
      warn(
        `"${vendor}" is configured as both a script integration and a built-in integration — ` +
          "remove one to avoid loading it twice (e.g. double-counted events).",
      );
    }
  }
}

/** Live status of one integration — read by the debug/self-check view. */
export type IntegrationStatus =
  | "idle" // afterConsent, waiting for consent
  | "loading"
  | "active" // loaded and running
  | "silenced" // loaded, told to go quiet
  | "removed" // was loaded, removed on revoke
  | "error"; // setup failed; retried on the next trigger

/** What the engine needs from the consent runtime — framework-agnostic. */
export type IntegrationHost = {
  /** Committed-granted state for a category (never the unsaved toggle). */
  granted: (category: ConsentCategory) => boolean;
  /** Subscribe to committed-consent changes; returns unsubscribe. */
  subscribe: (fn: () => void) => () => void;
  region: RegionDecision;
};

type Entry = {
  integration: Integration;
  status: IntegrationStatus;
  everLoaded: boolean;
  loading: boolean;
  control: undefined | Cleanup | SilenceControl;
  /** Has this category ever been granted? Gates `remove` to real withdrawals. */
  wasGranted: boolean;
  /** Consent-change listeners the vendor opened via `ctx.onConsentChange`. */
  subs: Set<() => void>;
};

export type IntegrationRunner = {
  /** Current status per integration id — the debug/self-check view reads this. */
  status: () => Record<string, IntegrationStatus>;
  /**
   * Tear the runner down: stop reconciling, release every vendor's
   * consent-change listener, and undo each loaded vendor — `remove` runs its
   * cleanup, `silence` is silenced. `keep` vendors' scripts stay (that's the
   * mode), but their listeners are still released. Safe to call more than once.
   */
  stop: () => void;
};

function warn(message: string, err?: unknown): void {
  if (typeof console !== "undefined") {
    // eslint-disable-next-line no-console
    if (err !== undefined) console.error(`[cookieyes] ${message}`, err);
    else console.warn(`[cookieyes] ${message}`);
  }
}

/**
 * Run a set of integrations against the consent runtime. Reconciles each one on
 * load and on every committed-consent change:
 * - not loaded → load it (immediately, or once its category is granted)
 * - `keep`     → nothing on revoke (the vendor manages its own update)
 * - `remove`   → run cleanup on revoke; re-load on re-grant
 * - `silence`  → call `silence()` on revoke; `resume()` on re-grant
 *
 * `setup` may be async and may fail; a failure marks the integration `error`
 * and is retried on the next trigger (never loops on its own). Nothing here
 * throws into the host.
 */
export function runIntegrations(
  integrations: Integration[],
  host: IntegrationHost,
): IntegrationRunner {
  const entries: Entry[] = [];
  const seenIds = new Set<string>();
  let stopped = false;

  for (const integration of integrations) {
    if (integration.version !== INTEGRATION_FORMAT_VERSION) {
      // Unknown format version → refuse to run it, don't guess (Story 5).
      warn(
        `integration "${integration.id}" uses format version ${integration.version}, ` +
          `but this build understands ${INTEGRATION_FORMAT_VERSION}. Skipping it.`,
      );
      continue;
    }
    if (seenIds.has(integration.id)) {
      // A duplicate id would collide in the status view and run twice — skip it
      // rather than show a wrong picture (Story 7's "flag common mistakes").
      warn(`integration "${integration.id}" is registered more than once; skipping the duplicate.`);
      continue;
    }
    seenIds.add(integration.id);
    entries.push({
      integration,
      status: "idle",
      everLoaded: false,
      loading: false,
      control: undefined,
      subs: new Set(),
      wasGranted: false,
    });
  }

  function ctxFor(entry: Entry): SetupCtx {
    return {
      granted: () => host.granted(entry.integration.category),
      onConsentChange: (fn) => {
        // Track the vendor's listener so it's released on teardown — otherwise a
        // removed or stopped vendor keeps listening forever.
        const unsub = host.subscribe(fn);
        entry.subs.add(unsub);
        return () => {
          if (entry.subs.delete(unsub)) unsub();
        };
      },
      region: host.region,
    };
  }

  function releaseSubs(entry: Entry): void {
    for (const unsub of entry.subs) {
      try {
        unsub();
      } catch {
        // A vendor's own unsubscribe throwing is non-fatal.
      }
    }
    entry.subs.clear();
  }

  /** Undo a loaded vendor: remove → cleanup, silence → silence. keep: nothing. */
  function undo(entry: Entry): void {
    const { integration, control } = entry;
    try {
      if (integration.onRevoke === "remove") (control as Cleanup | undefined)?.();
      else if (integration.onRevoke === "silence")
        (control as SilenceControl | undefined)?.silence();
    } catch (err) {
      warn(`integration "${integration.id}" threw while being torn down.`, err);
    }
    entry.control = undefined;
  }

  /** Release listeners and undo the vendor if it's currently loaded/active. */
  function teardownEntry(entry: Entry): void {
    releaseSubs(entry);
    if (entry.status !== "active") return; // idle/silenced/removed/error: nothing to undo
    undo(entry);
    // `keep` leaves the script on the page (only the listener was released).
    if (entry.integration.onRevoke === "remove") entry.status = "removed";
    else if (entry.integration.onRevoke === "silence") entry.status = "silenced";
  }

  function load(entry: Entry): void {
    entry.loading = true;
    entry.status = "loading";
    // Normalise sync/async setup into a promise; a sync throw becomes a reject.
    Promise.resolve()
      .then(() => entry.integration.setup(ctxFor(entry)))
      .then((control) => {
        entry.loading = false;
        entry.control = control ?? undefined;
        entry.everLoaded = true;
        entry.status = "active";
        if (stopped) {
          // Torn down while loading → undo this load right away so the vendor
          // doesn't linger past teardown.
          teardownEntry(entry);
          return;
        }
        // Consent may have flipped while we were loading — reconcile once more.
        reconcile(entry);
      })
      .catch((err) => {
        entry.loading = false;
        entry.status = "error";
        releaseSubs(entry); // a failed setup may have subscribed before throwing
        warn(
          `integration "${entry.integration.id}" failed to load; will retry on the next change.`,
          err,
        );
      });
  }

  function reconcile(entry: Entry): void {
    const { integration } = entry;
    const granted = host.granted(integration.category);
    // Record a grant even while the script is still loading — otherwise a
    // grant-then-withdraw during the load window is lost, and a `remove` vendor
    // would never be removed afterward.
    if (granted) entry.wasGranted = true;
    if (stopped || entry.loading) return;

    // Not currently loaded (idle / removed / error) → decide whether to load.
    if (entry.status === "idle" || entry.status === "removed" || entry.status === "error") {
      const shouldLoad = entry.everLoaded ? granted : integration.load === "immediately" || granted;
      if (shouldLoad) load(entry);
      return;
    }

    // Loaded (active / silenced) → apply the revoke mode.
    if (integration.onRevoke === "keep") return;

    if (integration.onRevoke === "remove") {
      // Only a real withdrawal (granted → denied) removes. A never-granted
      // `immediately` load must not load-then-remove (a wasted request);
      // `silence`, by contrast, stays ungated so it can quiet a vendor before
      // the first consent.
      if (!granted && entry.status === "active" && entry.wasGranted) {
        releaseSubs(entry); // the removed script's listeners go with it
        try {
          (entry.control as Cleanup | undefined)?.();
        } catch (err) {
          warn(`integration "${integration.id}" cleanup threw on revoke.`, err);
        }
        entry.control = undefined;
        entry.status = "removed";
      }
      return;
    }

    // silence
    const sc = entry.control as SilenceControl | undefined;
    if (!granted && entry.status === "active") {
      try {
        sc?.silence();
      } catch (err) {
        warn(`integration "${integration.id}" silence() threw.`, err);
      }
      entry.status = "silenced";
    } else if (granted && entry.status === "silenced") {
      try {
        sc?.resume();
      } catch (err) {
        warn(`integration "${integration.id}" resume() threw.`, err);
      }
      entry.status = "active";
    }
  }

  function reconcileAll(): void {
    for (const entry of entries) reconcile(entry);
  }

  const unsubscribe = host.subscribe(reconcileAll);
  reconcileAll(); // initial pass

  return {
    status: () => {
      const out: Record<string, IntegrationStatus> = {};
      for (const entry of entries) out[entry.integration.id] = entry.status;
      return out;
    },
    stop: () => {
      if (stopped) return;
      stopped = true;
      unsubscribe();
      for (const entry of entries) teardownEntry(entry);
    },
  };
}

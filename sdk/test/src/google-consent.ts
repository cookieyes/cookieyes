import type { GoogleConsentSignal } from "@cookieyes/core";

/**
 * Google Consent Mode is the one signal that was invisible headlessly.
 *
 * Core's `broadcastGoogleConsent` no-ops unless a `window` exists *and*
 * `window.dataLayer` is an array (`google-consent-mode.ts`). In Node there is no
 * window at all, so the broadcast could not be observed — leaving the "every kind
 * of signal" promise unmet for the signal EEA advertisers depend on most.
 *
 * Opt in with `googleConsentMode: true` and this installs the smallest thing core
 * will accept, then reads back what was pushed.
 */

/** One `gtag("consent", …)` broadcast, decoded from the dataLayer. */
export type GoogleConsentUpdate = {
  /** `"update"` for a consent change, `"default"` if the page set one. */
  action: string;
  /** Each Consent Mode signal and whether it is granted. */
  signals: Partial<Record<GoogleConsentSignal, "granted" | "denied">>;
};

type DataLayerHost = { dataLayer?: unknown[] | undefined };

/**
 * Hostname reported to `payload.domain` while a shimmed window is in place.
 * Without `googleConsentMode` there is no window and core reports `"unknown"`
 * (`sync.ts`) — the difference is documented in the README's fidelity table.
 */
export const TEST_HOSTNAME = "cookieyes-test.local";

let restore: (() => void) | null = null;

export function installDataLayer(): void {
  if (restore) return;
  const scope = globalThis as { window?: unknown };

  if (typeof scope.window === "undefined") {
    // `location` is not optional. The moment a window exists, core reads
    // `window.location.hostname` (sync.ts) and may call `.reload()`
    // (manager.ts) — a window without them turns a safe no-op into a TypeError.
    const shim = {
      dataLayer: [] as unknown[],
      location: {
        hostname: TEST_HOSTNAME,
        href: `https://${TEST_HOSTNAME}/`,
        reload: () => undefined,
      },
    };
    Object.defineProperty(globalThis, "window", {
      value: shim,
      configurable: true,
      writable: true,
    });
    restore = () => {
      Reflect.deleteProperty(globalThis, "window");
    };
    return;
  }

  // A real window (jsdom): add only the dataLayer, and put back exactly what was
  // there — a test that set up its own dataLayer must not lose it.
  const host = scope.window as DataLayerHost;
  const previous = host.dataLayer;
  host.dataLayer = [];
  restore = () => {
    if (previous === undefined) Reflect.deleteProperty(host as object, "dataLayer");
    else host.dataLayer = previous;
  };
}

/** Undo {@link installDataLayer}. Idempotent. */
export function restoreDataLayer(): void {
  restore?.();
  restore = null;
}

function currentDataLayer(): unknown[] {
  const scope = globalThis as { window?: DataLayerHost };
  const layer = scope.window?.dataLayer;
  return Array.isArray(layer) ? layer : [];
}

/**
 * Decode the consent broadcasts on the dataLayer, oldest first.
 *
 * Core emits them in gtag's exact wire format — an `arguments` object, not an
 * array (`google-consent-mode.ts` reproduces the canonical snippet on purpose) —
 * so entries are read positionally and anything that isn't a `consent` command is
 * skipped. That leaves a page's own unrelated dataLayer pushes alone.
 */
export function readGoogleConsent(): GoogleConsentUpdate[] {
  const updates: GoogleConsentUpdate[] = [];

  for (const entry of currentDataLayer()) {
    if (entry === null || typeof entry !== "object") continue;
    const args = entry as ArrayLike<unknown>;
    if (typeof args.length !== "number" || args.length < 3) continue;
    if (args[0] !== "consent") continue;

    const signals = args[2];
    if (signals === null || typeof signals !== "object") continue;

    updates.push({
      action: String(args[1]),
      signals: { ...(signals as GoogleConsentUpdate["signals"]) },
    });
  }

  return updates;
}

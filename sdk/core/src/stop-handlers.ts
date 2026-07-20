import type { ConsentCategory } from "./types.js";

/**
 * A tool that can be stopped (and optionally resumed) at runtime when consent
 * for its category changes — no page reload needed. `stop()` is called when the
 * category is revoked; `resume()` (if provided) when it's re-granted.
 *
 * If `stop()` throws, that tool is treated as "couldn't be stopped cleanly" and
 * falls back to the reload notice for that one tool — it never breaks the page.
 */
export type StopHandler = {
  id: string;
  category: ConsentCategory;
  stop: () => void;
  resume?: (() => void) | undefined;
};

/**
 * A tool with no known clean runtime stop — revoking its category can only be
 * fully applied by reloading the page. Registering one means "if this category
 * is revoked, show the visitor the reload notice."
 */
export type ReloadOnlyHandler = {
  id: string;
  category: ConsentCategory;
  needsReload: true;
};

export type AnyStopHandler = StopHandler | ReloadOnlyHandler;

function isReloadOnly(h: AnyStopHandler): h is ReloadOnlyHandler {
  return "needsReload" in h && h.needsReload === true;
}

/**
 * Built-in, first-party integrations. Each maps to either a clean stop-handler
 * or a reload-only marker (see the audit in the README).
 *
 * Note: Google Analytics 4 and Google Tag Manager are **not** listed here.
 * They're governed by Google Consent Mode v2, which the SDK broadcasts
 * automatically whenever a `dataLayer` is present (see google-consent-mode.ts)
 * — on load and on every consent change, derived from each category's `gcm`
 * mapping. So you don't register them as integrations; just add the standard
 * Consent Mode default snippet and the SDK owns the updates.
 *
 * VERIFIED clean-stop vendors (documented, stable runtime opt-out):
 * - `meta`  — `fbq('consent','revoke'|'grant')`, Meta's official consent API.
 *
 * The rest have no confident, documented runtime stop, so they're modelled as
 * reload-only (Story 1's honest answer). Upgrading any of them to a clean-stop
 * later is a one-line change here once a real API is confirmed.
 */
export type BuiltInIntegration =
  | { vendor: "meta"; category?: ConsentCategory | undefined }
  | { vendor: "tiktok"; category?: ConsentCategory | undefined }
  | { vendor: "linkedin"; category?: ConsentCategory | undefined }
  | { vendor: "hotjar"; category?: ConsentCategory | undefined }
  | { vendor: "segment"; category?: ConsentCategory | undefined };

type WindowWithVendors = Window &
  typeof globalThis & {
    fbq?: (...args: unknown[]) => void;
  };

export function resolveBuiltInIntegration(cfg: BuiltInIntegration): AnyStopHandler {
  switch (cfg.vendor) {
    case "meta":
      return {
        id: "meta",
        category: cfg.category ?? "advertisement",
        stop: () => (window as WindowWithVendors).fbq?.("consent", "revoke"),
        resume: () => (window as WindowWithVendors).fbq?.("consent", "grant"),
      };
    // No confident documented runtime stop — reload-only (see README audit).
    case "tiktok":
      return { id: "tiktok", category: cfg.category ?? "advertisement", needsReload: true };
    case "linkedin":
      return { id: "linkedin", category: cfg.category ?? "advertisement", needsReload: true };
    case "hotjar":
      return { id: "hotjar", category: cfg.category ?? "analytics", needsReload: true };
    case "segment":
      return { id: "segment", category: cfg.category ?? "analytics", needsReload: true };
  }
}

// --- Registry (module-level, mirrors scripts.ts) ---

const handlers = new Map<string, AnyStopHandler>();
// Tracks which clean-stop handlers are currently in the "stopped" state, so we
// only fire stop()/resume() on an actual transition, not on every save.
const stopped = new Set<string>();
// Tracks reload-only handlers whose category is currently granted (so the tool
// is presumed to be running). A reload notice is raised only when one of these
// transitions granted → denied — i.e. a genuine withdrawal of something that
// could be active — not on a standing/first-time reject where it never ran.
const reloadActive = new Set<string>();

export function registerStopHandler(handler: AnyStopHandler): void {
  handlers.set(handler.id, handler);
}

/** Test-only: reset registry + transition state between cases. */
export function _clearStopHandlers(): void {
  handlers.clear();
  stopped.clear();
  reloadActive.clear();
}

export type StopHandlerResult = {
  /** Ids of reload-only tools just revoked (were granted, now denied). */
  reloadRequiredBy: string[];
};

/**
 * Reconcile every registered handler against the current consent state:
 * - clean handler denied  → run `stop()` (once), or flag reload if it throws
 * - clean handler granted → run `resume()` (once) for anything previously stopped
 * - reload-only handler   → flag reload only on a granted → denied transition
 *
 * Never throws: a failing `stop()` is downgraded to a reload requirement for
 * that one tool, so a broken handler can't break the page.
 */
export function applyStopHandlers(categories: Record<string, boolean>): StopHandlerResult {
  const reloadRequiredBy: string[] = [];

  for (const handler of handlers.values()) {
    const denied = categories[handler.category] !== true;

    if (isReloadOnly(handler)) {
      if (denied) {
        // Only a genuine revoke (was granted/active, now denied) warrants the
        // notice — a first-time or standing reject never had it running.
        if (reloadActive.has(handler.id)) {
          reloadRequiredBy.push(handler.id);
          reloadActive.delete(handler.id);
        }
      } else {
        reloadActive.add(handler.id);
      }
      continue;
    }

    if (denied) {
      if (!stopped.has(handler.id)) {
        try {
          handler.stop();
          stopped.add(handler.id);
        } catch {
          // Couldn't stop cleanly → fall back to the reload notice for this one.
          reloadRequiredBy.push(handler.id);
        }
      }
    } else if (stopped.has(handler.id)) {
      stopped.delete(handler.id);
      try {
        handler.resume?.();
      } catch {
        // A failed resume is non-fatal; the next accept re-attempts nothing
        // worse than the tool staying stopped until reload.
      }
    }
  }

  return { reloadRequiredBy };
}

/**
 * Load-time initialization: reflect the *full* stored consent state in both
 * directions, once, so tools start in the right mode from first paint.
 *
 * This is distinct from {@link applyStopHandlers} (which only fires on
 * transitions): a returning visitor who previously *granted* a category must
 * get a `resume()` at load — e.g. Consent Mode `update: granted` — otherwise
 * they stay stuck in the page's deny-by-default state despite having consented.
 * Denied categories get `stop()`. It never raises a reload notice (a fresh load
 * needs no "reload to apply"), but it *does* seed reload-only tools' active
 * state from the stored consent, so a later live revoke is correctly detected.
 */
export function initStopHandlers(categories: Record<string, boolean>): void {
  for (const handler of handlers.values()) {
    const denied = categories[handler.category] !== true;

    if (isReloadOnly(handler)) {
      // Seed active state (granted = presumed running) so a later granted →
      // denied revoke raises the notice; never raise it at load itself.
      if (denied) reloadActive.delete(handler.id);
      else reloadActive.add(handler.id);
      continue;
    }

    try {
      if (denied) {
        handler.stop();
        stopped.add(handler.id);
      } else {
        // Granted at load → reflect stored consent (e.g. Consent Mode grant).
        stopped.delete(handler.id);
        handler.resume?.();
      }
    } catch {
      // Never let a vendor handler break page load; state simply stays as-is.
    }
  }
}

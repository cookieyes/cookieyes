import type { ProviderContext } from "../keys.js";
import type { CookieYesSnapshot } from "../runtime.js";

/**
 * @internal The snapshot used for the server render and the hydrating render. Without an
 * `initialConsent` it is the runtime's server snapshot, which describes a fresh visitor. With
 * one, the stored decision is folded in so a returning visitor's banner is never rendered.
 * Only the consent fields come from the stored decision: `regulation` stays whatever the
 * runtime resolved for this request.
 */
export function _useServerSnapshot(context: ProviderContext): () => CookieYesSnapshot {
  const snapshot = $derived.by((): CookieYesSnapshot => {
    const base = context.runtime.getServerSnapshot();
    const stored = context.ssrConsent();
    if (stored == null) return base;
    return {
      ...base,
      consentId: stored.consentId,
      hasActed: stored.hasActed,
      categories: { ...stored.categories },
      // A stored decision is committed by definition, so gated content unblocks on first render.
      committedCategories: { ...stored.categories },
      lastRenewed: stored.lastRenewed,
      taxonomyHash: stored.taxonomyHash,
    };
  });
  return () => snapshot;
}

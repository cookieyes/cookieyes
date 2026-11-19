import type { ConsentCategory } from "@cookieyes/core";
import { type ComputedRef, computed, type MaybeRefOrGetter, toValue } from "vue";
import { _useSnapshot } from "./useSnapshot.js";

/**
 * A single category's committed consent: the value after Accept, Reject or Save, not an unsaved
 * dialog toggle. Use it for gating an embed or a tracker. The category may be a ref or a getter.
 */
export function useConsentCategory(
  category: MaybeRefOrGetter<ConsentCategory>,
): ComputedRef<boolean> {
  const snapshot = _useSnapshot("useConsentCategory");
  return computed(() => snapshot.value.committedCategories[toValue(category)] === true);
}

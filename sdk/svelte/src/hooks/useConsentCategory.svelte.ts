import type { ConsentCategory } from "@cookieyes/core";
import { _current, type Reactive } from "./reactive.svelte.js";
import { _useSnapshot } from "./useSnapshot.svelte.js";

/**
 * A single category's committed consent: the value after Accept, Reject or Save, not an unsaved
 * dialog toggle. Use it for gating an embed or a tracker. The category may be a string or a
 * getter, so one that comes from a prop stays reactive.
 */
export function useConsentCategory(
  category: ConsentCategory | (() => ConsentCategory),
): Reactive<boolean> {
  const snapshot = _useSnapshot("useConsentCategory");
  return _current(
    () =>
      snapshot().committedCategories[typeof category === "function" ? category() : category] ===
      true,
  );
}

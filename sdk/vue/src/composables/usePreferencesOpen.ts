import { type ComputedRef, computed } from "vue";
import { _useSnapshot } from "./useSnapshot.js";

/** Whether the preferences dialog is open. */
export function usePreferencesOpen(): ComputedRef<boolean> {
  const snapshot = _useSnapshot("usePreferencesOpen");
  return computed(() => snapshot.value.isPreferencesOpen);
}

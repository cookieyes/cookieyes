import { type ComputedRef, computed } from "vue";
import { _useSnapshot } from "./useSnapshot.js";

/** Whether the opt-out ("Do Not Sell") dialog is open. */
export function useOptOutOpen(): ComputedRef<boolean> {
  const snapshot = _useSnapshot("useOptOutOpen");
  return computed(() => snapshot.value.isOptOutOpen);
}

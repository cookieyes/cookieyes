import type { Regulation } from "@cookieyes/core";
import { type ComputedRef, computed, inject } from "vue";
import { _REGION_KEY } from "../keys.js";
import { _useSnapshot } from "./useSnapshot.js";

/**
 * The regulation in effect. A `<CookieYesProvider>` above the component resolves it per request,
 * so the server renders the correct banner; without one it follows the runtime.
 */
export function useRegulation(): ComputedRef<Regulation> {
  const fromProvider = inject(_REGION_KEY, null);
  const snapshot = _useSnapshot("useRegulation");
  return computed(() => (fromProvider ? fromProvider.value.regulation : snapshot.value.regulation));
}

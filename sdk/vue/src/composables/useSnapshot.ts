import { type ComputedRef, computed, getCurrentInstance, onMounted, shallowRef } from "vue";
import type { CookieYesSnapshot } from "../runtime.js";
import { _isServerFirst } from "./server-first.js";
import { _useRuntime } from "./useRuntime.js";
import { _useServerSnapshot } from "./useServerSnapshot.js";

/**
 * @internal The snapshot every state composable selects from. Server and hydrating renders read
 * the server snapshot, then the live one after mount. A plain client mount reads the live one at
 * once, so nothing is rendered and removed again.
 */
export function _useSnapshot(name: string): ComputedRef<CookieYesSnapshot> {
  const runtime = _useRuntime(name);
  const serverFirst = _isServerFirst();
  const live = shallowRef(!serverFirst);
  if (serverFirst && getCurrentInstance()) {
    onMounted(() => {
      live.value = true;
    });
  }
  const server = _useServerSnapshot(runtime);
  return computed(() => (live.value ? runtime.state.value : server.value));
}

import { _useRuntime } from "./useRuntime.js";
import { _useSnapshot } from "./useSnapshot.svelte.js";

/**
 * What `useReloadNotice()` returns. `required` and `reasons` are getters, so each read reflects
 * the runtime at that moment.
 */
export type UseReloadNoticeResult = {
  /** True when a revoked tool has no clean runtime stop and only a reload fully applies it. */
  readonly required: boolean;
  /** The ids of the handlers that triggered the notice. */
  readonly reasons: string[];
  /** Dismiss the notice; it does not reappear until a new revoke needs a reload. */
  dismiss: () => void;
};

/**
 * Reads the reload-notice state. It drives the built-in `<ReloadNotice />`; use it directly only
 * for a fully custom notice.
 */
export function useReloadNotice(): UseReloadNoticeResult {
  const runtime = _useRuntime("useReloadNotice");
  const snapshot = _useSnapshot("useReloadNotice");
  return {
    get required() {
      return snapshot().reloadNotice.required;
    },
    get reasons() {
      return snapshot().reloadNotice.reasons;
    },
    dismiss: () => runtime.dismissReloadNotice(),
  };
}

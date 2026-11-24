import { _current, type Reactive } from "./reactive.svelte.js";
import { _useSnapshot } from "./useSnapshot.svelte.js";

/** Whether the opt-out ("Do Not Sell") dialog is open. */
export function useOptOutOpen(): Reactive<boolean> {
  const snapshot = _useSnapshot("useOptOutOpen");
  return _current(() => snapshot().isOptOutOpen);
}

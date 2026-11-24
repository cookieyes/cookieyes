import { _current, type Reactive } from "./reactive.svelte.js";
import { _useSnapshot } from "./useSnapshot.svelte.js";

/** Whether the preferences dialog is open. */
export function usePreferencesOpen(): Reactive<boolean> {
  const snapshot = _useSnapshot("usePreferencesOpen");
  return _current(() => snapshot().isPreferencesOpen);
}

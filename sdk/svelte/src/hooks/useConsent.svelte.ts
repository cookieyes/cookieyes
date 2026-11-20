import type { CookieYesSnapshot } from "../runtime.js";
import { _view } from "./reactive.svelte.js";
import { _useSnapshot } from "./useSnapshot.svelte.js";

/**
 * The recommended way to read consent state. Tracks every change: accepted and rejected
 * categories, banner visibility and the rest. Read fields where Svelte tracks them, such as a
 * template or `$derived`; destructuring reads once. For one category see `useConsentCategory()`;
 * for actions see `useConsentActions()`.
 */
export function useConsent(): CookieYesSnapshot {
  const snapshot = _useSnapshot("useConsent");
  return _view(snapshot);
}

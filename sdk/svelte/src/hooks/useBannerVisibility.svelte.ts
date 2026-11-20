import { isBannerVisible } from "@cookieyes/ui";
import { _current, type Reactive } from "./reactive.svelte.js";
import { _useSnapshot } from "./useSnapshot.svelte.js";

/** Whether the banner is on screen: until the visitor decides, and not while a dialog is open. */
export function useBannerVisibility(): Reactive<boolean> {
  const snapshot = _useSnapshot("useBannerVisibility");
  return _current(() => isBannerVisible(snapshot()));
}

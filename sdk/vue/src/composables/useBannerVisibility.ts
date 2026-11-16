import { isBannerVisible } from "@cookieyes/ui";
import { type ComputedRef, computed } from "vue";
import { _useSnapshot } from "./useSnapshot.js";

/** Whether the banner is on screen: until the visitor decides, and not while a dialog is open. */
export function useBannerVisibility(): ComputedRef<boolean> {
  const snapshot = _useSnapshot("useBannerVisibility");
  return computed(() => isBannerVisible(snapshot.value));
}

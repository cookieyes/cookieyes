import type { Regulation } from "@cookieyes/core";

/** The parts of the consent state that decide what is on screen. */
export type SurfaceState = {
  hasActed: boolean;
  isBannerDismissed: boolean;
  isPreferencesOpen: boolean;
  isOptOutOpen: boolean;
};

/**
 * The banner shows until the visitor decides or closes it, and steps aside
 * while either dialog is open.
 */
export function isBannerVisible(s: SurfaceState): boolean {
  return !s.hasActed && !s.isBannerDismissed && !s.isPreferencesOpen && !s.isOptOutOpen;
}

/**
 * The recall button shows once the banner is gone and no dialog is open. A
 * banner closed without a decision still needs a way back to the choice. Under
 * CCPA it shows from the start, because the visitor may opt out at any time.
 */
export function isRecallVisible(s: SurfaceState, regulation: Regulation): boolean {
  if (isBannerVisible(s) || s.isPreferencesOpen || s.isOptOutOpen) return false;
  return s.hasActed || s.isBannerDismissed || regulation === "CCPA";
}

import type { ReloadNoticeState } from "@cookieyes/core";
import type { CookieYesRuntime } from "@cookieyes/react";
import type { ConsentTestBase, HarnessSnapshot } from "./types.js";

/**
 * These types live apart from `types.ts` on purpose: they reference
 * `@cookieyes/react`, and the package's main entry must stay importable by
 * someone who has never installed React.
 */

/** A core snapshot plus the UI flags `@cookieyes/react` layers on top. */
export type ReactHarnessSnapshot<Id extends string> = HarnessSnapshot<Id> & {
  /** Is the preferences dialog open? */
  isPreferencesOpen: boolean;
  /** Is the CCPA opt-out dialog open? */
  isOptOutOpen: boolean;
  /** Current reload-notice state (a revoked tool with no clean runtime stop). */
  reloadNotice: ReloadNoticeState;
};

export type ReactConsentTest<Id extends string> = Omit<ConsentTestBase<Id>, "snapshot"> & {
  /** The real `CookieYesRuntime` the React hooks and components are reading. */
  readonly runtime: CookieYesRuntime;
  /** The core snapshot plus React's UI flags. */
  snapshot(): ReactHarnessSnapshot<Id>;
  /** Open the preferences dialog, as `<RecallButton />` would. */
  showPreferences(): void;
  hidePreferences(): void;
  /** Open the CCPA opt-out dialog. */
  showOptOut(): void;
  hideOptOut(): void;
  /** Dismiss the reload notice. */
  dismissReloadNotice(): void;
};

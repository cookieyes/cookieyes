"use client";

import type { ReloadNoticeState } from "@cookieyes/core";
import { _tryGetCookieYes } from "../runtime.js";
import { useRuntimeSelector } from "./useRuntimeSelector.js";

const NO_NOTICE: ReloadNoticeState = { required: false, reasons: [] };

export type UseReloadNoticeResult = ReloadNoticeState & {
  /** Dismiss the notice; it won't reappear until a new revoke needs a reload. */
  dismiss: () => void;
};

/**
 * Reads the reload-notice state — `required` becomes true when a revoked tool
 * has no clean runtime stop and can only be fully applied by reloading. Drives
 * the built-in `<ReloadNotice />`; use directly only for a fully custom notice.
 */
export function useReloadNotice(): UseReloadNoticeResult {
  const notice = useRuntimeSelector((snap) => snap.reloadNotice, NO_NOTICE);
  const runtime = _tryGetCookieYes();
  return {
    ...notice,
    dismiss: () => runtime?.dismissReloadNotice(),
  };
}

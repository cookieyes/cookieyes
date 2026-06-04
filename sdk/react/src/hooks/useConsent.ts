"use client";

import { useSyncExternalStore } from "react";
import {
  _noopSubscribe,
  _SSR_SNAPSHOT,
  _tryGetCookieYes,
  type CookieYesSnapshot,
} from "../runtime.js";

export function useConsent(): CookieYesSnapshot {
  const runtime = _tryGetCookieYes();
  return useSyncExternalStore(
    runtime?.subscribe ?? _noopSubscribe,
    () => (runtime ? runtime.getSnapshot() : _SSR_SNAPSHOT),
    () => _SSR_SNAPSHOT,
  );
}

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
    // Match the other hooks: derive the SSR value from the mounted runtime's
    // regulation-aware server snapshot so server-rendered consent state is
    // internally consistent (and matches the client's first hydration render).
    () => (runtime ? runtime.getServerSnapshot() : _SSR_SNAPSHOT),
  );
}

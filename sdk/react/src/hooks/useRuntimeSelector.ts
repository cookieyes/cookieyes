"use client";

import { useSyncExternalStore } from "react";
import { _noopSubscribe, _tryGetCookieYes, type CookieYesSnapshot } from "../runtime.js";

export function useRuntimeSelector<T>(
  select: (snap: CookieYesSnapshot) => T,
  serverFallback: T,
): T {
  const runtime = _tryGetCookieYes();
  return useSyncExternalStore(
    runtime?.subscribe ?? _noopSubscribe,
    () => (runtime ? select(runtime.getSnapshot()) : serverFallback),
    () => serverFallback,
  );
}

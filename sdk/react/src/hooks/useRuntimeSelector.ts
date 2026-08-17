"use client";

import { useSyncExternalStore } from "react";
import { _noopSubscribe, _tryGetCookieYes, type CookieYesSnapshot } from "../runtime.js";
import { useServerSnapshot } from "./useServerSnapshot.js";

export function useRuntimeSelector<T>(
  select: (snap: CookieYesSnapshot) => T,
  serverFallback: T,
): T {
  const runtime = _tryGetCookieYes();
  const serverSnapshot = useServerSnapshot(runtime);
  return useSyncExternalStore(
    runtime?.subscribe ?? _noopSubscribe,
    () => (runtime ? select(runtime.getSnapshot()) : serverFallback),
    // Server + first hydration render: derive from the mounted runtime's SSR
    // snapshot so the banner is present in server-rendered HTML (first-byte
    // paint) with the correct regulation — or, when a returning visitor's stored
    // consent was supplied via `<CookieYesProvider initialConsent>`, absent from
    // it entirely rather than rendered and then removed. Falls back to
    // `serverFallback` only when no runtime is mounted. Both server and
    // client-hydration produce the same value here, so there is no hydration
    // mismatch; the real client state is read from getSnapshot() after commit.
    () => (runtime ? select(serverSnapshot) : serverFallback),
  );
}

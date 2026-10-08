"use client";

import { useCallback, useState } from "react";
import {
  readCookie,
  readLocalStorage,
  removeLocalStorage,
  writeCookie,
  writeLocalStorage,
} from "../lib/storage.js";

// One name for both: the SDK's own readers (react's `runtime.ts` and
// `CookieYesProvider`) fall back to localStorage under this key. A different
// key here once made the panel show an override the SDK wasn't applying.
const COOKIE_NAME = "__cyd_region";
const STORAGE_KEY = COOKIE_NAME;

function readInitial(): string | undefined {
  // The cookie is authoritative (a server helper can read it too); fall back
  // to localStorage for the same value if the cookie was somehow cleared.
  return readCookie(COOKIE_NAME) ?? readLocalStorage(STORAGE_KEY);
}

/**
 * Read/write the `forceRegion` dev override (AD-4): both a `__cyd_region`
 * cookie (so a server helper — `getServerRegion` — can read it for the next
 * SSR pass) and a `localStorage` entry of the same name (so the client-side
 * `resolveRegion` re-run on the next mount/render picks it up immediately,
 * without waiting on a reload). Writing here never touches the runtime
 * singleton directly — see AD-4's "never store per-visitor state on the
 * module-level runtime singleton" rule.
 */
export function useForceRegion() {
  const [region, setRegionState] = useState<string | undefined>(() => readInitial());

  const setRegion = useCallback((value: string | undefined) => {
    setRegionState(value);
    writeCookie(COOKIE_NAME, value);
    if (value === undefined) removeLocalStorage(STORAGE_KEY);
    else writeLocalStorage(STORAGE_KEY, value);
  }, []);

  const clearRegion = useCallback(() => setRegion(undefined), [setRegion]);

  return { region, setRegion, clearRegion };
}

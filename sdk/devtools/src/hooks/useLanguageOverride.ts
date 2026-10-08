"use client";

import type { CookieYesRuntime, LanguageInfo } from "@cookieyes/react";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { readLocalStorage, removeLocalStorage, writeLocalStorage } from "../lib/storage.js";

const STORAGE_KEY = "cyd:language";

const NO_LANGUAGE: LanguageInfo = { language: "en", direction: "ltr", languages: ["en"] };
const noopSubscribe = () => () => undefined;

/** Outcome of the last switch the developer asked for. */
export type LanguageSwitchStatus =
  | { kind: "idle" }
  | { kind: "loading"; tag: string }
  | { kind: "failed"; tag: string };

/**
 * The language override: switches the runtime live with its own
 * `setLanguage` (the same call a site's language menu would make), and keeps
 * the choice in localStorage so it is re-applied after a reload.
 *
 * Unlike the region override, the SDK itself never reads this key: language is
 * already switchable at runtime, so no SDK code path needs a dev-only hook.
 * The cost is that a reload shows the configured language for a moment before
 * the override is applied again.
 */
export function useLanguageOverride(runtime: CookieYesRuntime | undefined) {
  const info = useSyncExternalStore(
    runtime?.subscribe ?? noopSubscribe,
    () => runtime?.getLanguageInfo() ?? NO_LANGUAGE,
    () => NO_LANGUAGE,
  );
  const [override, setOverride] = useState<string | undefined>(() => readLocalStorage(STORAGE_KEY));
  const [status, setStatus] = useState<LanguageSwitchStatus>({ kind: "idle" });
  // The language the site chose on its own, captured before any override is
  // applied, so "Clear" can go back to it.
  const configured = useRef<string | undefined>(undefined);
  const latest = useRef<string | undefined>(undefined);

  const apply = useCallback(
    async (tag: string) => {
      if (!runtime) return;
      latest.current = tag;
      setStatus({ kind: "loading", tag });
      await runtime.setLanguage(tag);
      // A later choice superseded this one while it loaded.
      if (latest.current !== tag) return;
      // `setLanguage` keeps the current language (and warns) when it has no
      // translations and no loader; it never rejects, so compare.
      const now = runtime.getLanguageInfo().language;
      setStatus(now === tag ? { kind: "idle" } : { kind: "failed", tag });
    },
    [runtime],
  );

  useEffect(() => {
    if (!runtime) return;
    configured.current ??= runtime.getLanguageInfo().language;
    const stored = readLocalStorage(STORAGE_KEY);
    if (stored && stored !== runtime.getLanguageInfo().language) void apply(stored);
  }, [runtime, apply]);

  const setLanguage = useCallback(
    (tag: string) => {
      setOverride(tag);
      writeLocalStorage(STORAGE_KEY, tag);
      void apply(tag);
    },
    [apply],
  );

  const clearLanguage = useCallback(() => {
    setOverride(undefined);
    removeLocalStorage(STORAGE_KEY);
    const back = configured.current;
    if (back) void apply(back);
    else setStatus({ kind: "idle" });
  }, [apply]);

  return { info, override, status, setLanguage, clearLanguage };
}

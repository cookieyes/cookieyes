"use client";

import type { TextDirection } from "@cookieyes/core";
import { useSyncExternalStore } from "react";
import { _noopSubscribe, _tryGetCookieYes } from "../runtime.js";

export type UseLanguageResult = {
  /** Active language tag, e.g. "en" or "fr". */
  language: string;
  /** Reading direction of the active language — use it to lay out a custom UI. */
  direction: TextDirection;
  /** Languages currently available to switch to without loading. */
  languages: string[];
  /**
   * Switch language live (no reload). If the language isn't loaded yet it's
   * fetched via `i18n.loadLanguage`; the promise resolves once it's applied.
   */
  setLanguage: (tag: string) => Promise<void>;
};

// Stable reference for the server / no-runtime case (useSyncExternalStore needs it).
const SSR_INFO = Object.freeze({
  language: "en",
  direction: "ltr" as TextDirection,
  languages: ["en"],
});

/**
 * The active language, its reading direction, and a live language switcher —
 * for building a custom, translatable consent UI.
 */
export function useLanguage(): UseLanguageResult {
  const runtime = _tryGetCookieYes();
  const read = () => runtime?.getLanguageInfo() ?? SSR_INFO;
  const info = useSyncExternalStore(runtime?.subscribe ?? _noopSubscribe, read, read);
  const setLanguage = runtime?.setLanguage ?? (() => Promise.resolve());
  return { ...info, setLanguage };
}

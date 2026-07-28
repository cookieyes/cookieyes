"use client";

import { defaultTranslations, type TranslationMap } from "@cookieyes/core";
import { useSyncExternalStore } from "react";
import { _noopSubscribe, _tryGetCookieYes } from "../runtime.js";

/**
 * Text for the active language (English fills any gaps). Re-renders when the
 * language is switched via {@link useLanguage}. On the server / before mount,
 * returns the English defaults.
 */
export function useTranslations(): TranslationMap {
  const runtime = _tryGetCookieYes();
  const read = () => runtime?.translations ?? defaultTranslations;
  return useSyncExternalStore(runtime?.subscribe ?? _noopSubscribe, read, read);
}

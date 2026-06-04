"use client";

import { defaultTranslations, type TranslationMap } from "@cookieyes/core";
import { _tryGetCookieYes } from "../runtime.js";

export function useTranslations(): TranslationMap {
  return _tryGetCookieYes()?.translations ?? defaultTranslations;
}

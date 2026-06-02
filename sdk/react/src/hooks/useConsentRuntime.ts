"use client";

import { type CookieYesRuntime, getCookieYes } from "../runtime.js";

export function useConsentRuntime(): CookieYesRuntime {
  return getCookieYes();
}

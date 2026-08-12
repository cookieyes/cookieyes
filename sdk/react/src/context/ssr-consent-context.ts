"use client";

import type { ConsentSnapshot } from "@cookieyes/core";
import { createContext } from "react";

/**
 * A returning visitor's stored consent, read from the request on the server and
 * supplied by `<CookieYesProvider initialConsent={…}>`. `null` means "no decision
 * on record" — the banner should render.
 *
 * This is React context, not runtime state, and deliberately so: the consent
 * runtime is a module-level singleton shared across concurrent server requests,
 * so a per-visitor value stored there would leak between them. Context is
 * per-render-tree, which is per-request.
 */
export const SsrConsentContext = createContext<ConsentSnapshot | null>(null);

"use client";

import type { RegionDecision } from "@cookieyes/core";
import { createContext } from "react";

/**
 * Per-request region decision supplied by `<CookieYesProvider>`. `null` when no
 * provider wraps the tree, in which case the hooks fall back to the runtime.
 * Because a provider resolves the same value on the server and the client, the
 * first paint's regulation is correct with no hydration mismatch.
 */
export const RegionContext = createContext<RegionDecision | null>(null);

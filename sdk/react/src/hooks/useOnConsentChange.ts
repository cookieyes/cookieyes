"use client";

import type { ConsentEventListener, ConsentEventOptions, ConsentEventType } from "@cookieyes/core";
import { useEffect, useRef } from "react";
import { _tryGetCookieYes } from "../runtime.js";

/**
 * Run your code when consent changes. `"save"` fires on every save, `"change"`
 * only when a category actually differs. The listener also fires once on mount
 * with the current state (`isInitial: true`); pass `{ category }` to hear about
 * a single category. Registration is cleaned up automatically on unmount.
 *
 * SSR-safe: on the server (no mounted runtime) it does nothing.
 *
 * ```tsx
 * useOnConsentChange("change", ({ changedCategories }) => {
 *   if (changedCategories.includes("analytics")) loadAnalytics();
 * });
 * ```
 */
export function useOnConsentChange(
  type: ConsentEventType,
  listener: ConsentEventListener,
  options?: ConsentEventOptions,
): void {
  // Keep the latest listener without re-subscribing on every render.
  const ref = useRef(listener);
  ref.current = listener;

  const category = options?.category;

  useEffect(() => {
    const runtime = _tryGetCookieYes();
    if (!runtime) return; // server render / no runtime mounted → no-op
    return runtime.on(type, (payload) => ref.current(payload), category ? { category } : undefined);
  }, [type, category]);
}

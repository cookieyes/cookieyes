"use client";

import { useRef } from "react";
import { useReloadNotice } from "../hooks/useReloadNotice.js";
import { useThemeConfig } from "../hooks/useThemeConfig.js";
import { useThemeVars } from "../hooks/useThemeVars.js";
import { useTranslations } from "../hooks/useTranslations.js";

/**
 * Non-intrusive, dismissible notice shown only when a revoked tool has no clean
 * runtime stop and can be fully applied only by reloading. It never reloads on
 * its own — the visitor stays in control. Wording comes from translations
 * (`reloadNotice.*`), so it's customizable via `.i18n(...)`.
 *
 * Announced to screen readers via `role="alert"`. Reachable by keyboard; once
 * dismissed it won't reappear until a genuinely new revoke needs a reload.
 */
export function ReloadNotice() {
  const { required, dismiss } = useReloadNotice();
  const t = useTranslations();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const { theme, colorScheme } = useThemeConfig();
  useThemeVars(containerRef, theme, colorScheme);

  if (!required) return null;

  return (
    <div ref={containerRef} className="cy-reload-notice" role="alert">
      <span className="cy-reload-notice-text">{t.reloadNotice.message}</span>
      <div className="cy-reload-notice-actions">
        <button
          type="button"
          className="cy-btn cy-btn-primary cy-reload-notice-reload"
          onClick={() => {
            if (typeof window !== "undefined") window.location.reload();
          }}
        >
          {t.reloadNotice.reloadButton}
        </button>
        <button
          type="button"
          className="cy-btn cy-btn-outline cy-reload-notice-dismiss"
          onClick={dismiss}
        >
          {t.reloadNotice.dismissButton}
        </button>
      </div>
    </div>
  );
}

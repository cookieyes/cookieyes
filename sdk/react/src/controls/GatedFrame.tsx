"use client";

import type { ConsentCategory } from "@cookieyes/core";
import { type IframeHTMLAttributes, type ReactNode, useRef } from "react";
import { useConsentActions } from "../hooks/useConsentActions.js";
import { useConsentCategory } from "../hooks/useConsentCategory.js";
import { useThemeConfig } from "../hooks/useThemeConfig.js";
import { useThemeVars } from "../hooks/useThemeVars.js";

type Props = Omit<IframeHTMLAttributes<HTMLIFrameElement>, "src"> & {
  src: string;
  category: ConsentCategory;
  placeholder?: ReactNode;
};

export function GatedFrame({ src, category, placeholder, ...rest }: Props) {
  const allowed = useConsentCategory(category);
  const { showPreferences } = useConsentActions();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const { theme, colorScheme } = useThemeConfig();
  useThemeVars(containerRef, theme, colorScheme);

  // Latch: once loaded under a committed grant, keep the iframe for the rest of
  // the session. Revoking doesn't swap it back to the placeholder mid-session;
  // the block takes effect on the next page load (when `allowed` starts false).
  const everAllowed = useRef(false);
  if (allowed) everAllowed.current = true;

  if (everAllowed.current) return <iframe src={src} {...rest} />;

  return (
    <div ref={containerRef} className="cy-frame-placeholder">
      {placeholder ?? (
        <>
          <p>
            This content requires <strong>{category}</strong> cookies to be enabled.
          </p>
          <button className="cy-btn cy-btn-primary" type="button" onClick={() => showPreferences()}>
            Manage Preferences
          </button>
        </>
      )}
    </div>
  );
}

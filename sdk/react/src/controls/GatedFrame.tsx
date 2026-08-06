"use client";

import type { ConsentCategory } from "@cookieyes/core";
import { type IframeHTMLAttributes, type ReactNode, useEffect, useRef, useState } from "react";
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

  // Never render a third-party iframe during SSR or the first hydration render:
  // consent is per-visitor and only known in the browser, so the server (a
  // shared process) must not decide it. Show the placeholder until mounted, then
  // let client consent take over. Keeps server and first client render identical
  // (no hydration mismatch, no cross-visitor leak).
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Latch: once loaded under a committed grant, keep the iframe for the rest of
  // the session. Revoking doesn't swap it back to the placeholder mid-session;
  // the block takes effect on the next page load (when `allowed` starts false).
  const everAllowed = useRef(false);
  if (mounted && allowed) everAllowed.current = true;

  if (mounted && everAllowed.current) return <iframe src={src} {...rest} />;

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

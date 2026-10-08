"use client";

import { _categoryLabel, _warnUnknownEmbedCategory, type ConsentCategory } from "@cookieyes/core";
import { type IframeHTMLAttributes, type ReactNode, useEffect, useRef, useState } from "react";
import { useCategories } from "../hooks/useCategories.js";
import { useConsentActions } from "../hooks/useConsentActions.js";
import { useConsentCategory } from "../hooks/useConsentCategory.js";
import { useThemeConfig } from "../hooks/useThemeConfig.js";
import { useThemeVars } from "../hooks/useThemeVars.js";
import { useTranslations } from "../hooks/useTranslations.js";
import { _tryGetCookieYes } from "../runtime.js";

/** Declared locally so the guard survives as a literal; see core's `deprecations.ts`. */
declare const process: { env: { NODE_ENV?: string } };

/** The global queue core pushes to; see the note in core's `network-blocker.ts`. */
type DevQueueEntry = { k: string; t: number; d: unknown };
type DevQueueArray = DevQueueEntry[] & { v?: number };
type DevGlobal = typeof globalThis & { __COOKIEYES_DEVTOOLS__?: DevQueueArray };

export type GatedFrameProps = Omit<IframeHTMLAttributes<HTMLIFrameElement>, "src"> & {
  src: string;
  category: ConsentCategory;
  placeholder?: ReactNode;
};

export function GatedFrame({ src, category, placeholder, ...rest }: GatedFrameProps) {
  const allowed = useConsentCategory(category);
  const { showPreferences } = useConsentActions();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const { theme, colorScheme } = useThemeConfig();
  const t = useTranslations();
  const categories = useCategories();
  useThemeVars(containerRef, theme, colorScheme);

  // Never render a third-party iframe during SSR or the first hydration render:
  // consent is per-visitor and only known in the browser, so the server (a
  // shared process) must not decide it. Show the placeholder until mounted, then
  // let client consent take over. Keeps server and first client render identical
  // (no hydration mismatch, no cross-visitor leak).
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!categories.ids.includes(category)) _warnUnknownEmbedCategory(category);
  }, [categories, category]);

  // Dev-only devtools instrumentation: the rendered `<iframe>` carries no
  // marker, so tell the scanner this src is managed, placeholder or not.
  // Folds away in production; see core's `network-blocker.ts`.
  // The guard sits around the hook, not inside it, so production drops the
  // whole call rather than keeping an empty effect.
  if (process.env.NODE_ENV !== "production") {
    // biome-ignore lint/correctness/useHookAtTopLevel: guarded by a build-time constant, stable per build.
    useEffect(() => {
      const q = ((globalThis as DevGlobal).__COOKIEYES_DEVTOOLS__ ??= Object.assign([], {
        v: 1,
      }));
      if (q.length >= 500) q.shift();
      q.push({ k: "s", t: Date.now(), d: { id: src, src, category, via: "GatedFrame" } });
    }, [src, category]);
  }

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
            {(() => {
              const [before = "", after = ""] = t.gatedFrame.placeholder.split("{category}");
              return (
                <>
                  {before}
                  <strong>
                    {_categoryLabel(
                      category,
                      t,
                      categories,
                      _tryGetCookieYes()?.getCategoryText(category),
                    )}
                  </strong>
                  {after}
                </>
              );
            })()}
          </p>
          <button className="cy-btn cy-btn-primary" type="button" onClick={() => showPreferences()}>
            {t.gatedFrame.action}
          </button>
        </>
      )}
    </div>
  );
}

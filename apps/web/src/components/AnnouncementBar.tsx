"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import type { Announcement } from "@/lib/announcement";
import { DISMISS_KEY_PREFIX } from "@/lib/announcement-gate.mjs";

const REGION_LABEL: Record<Announcement["kind"], string> = {
  release: "Release announcement",
  breaking: "Breaking change announcement",
  event: "Announcement",
};

/** The highlighted dots of each kind's mark, as [x, y] on the 8px grid: a plus, a square, a dot. */
const MARK: Record<Announcement["kind"], [number, number][]> = {
  release: [
    [40, 16],
    [32, 24],
    [40, 24],
    [48, 24],
    [40, 32],
  ],
  breaking: [
    [32, 16],
    [40, 16],
    [48, 16],
    [32, 24],
    [40, 24],
    [48, 24],
    [32, 32],
    [40, 32],
    [48, 32],
  ],
  event: [[40, 24]],
};

const COLLAPSE_MS = 180;

function rememberDismissed(id: string) {
  try {
    localStorage.setItem(DISMISS_KEY_PREFIX + id, "dismissed");
  } catch {
    // Storage blocked: dismissed for this visit only.
  }
}

/**
 * Marks the strip closing or gone on <html>, where the CSS and the before-paint script look,
 * and zeroes the height the sticky headers below it read. While "closing" that height
 * transitions to 0 alongside the strip itself.
 */
function setVisibility(value: "closing" | "off") {
  const root = document.documentElement;
  root.setAttribute("data-cy-ann", value);
  root.style.setProperty("--cy-ann-h", "0px");
}

/**
 * The announcement strip at the top of every page. Whether it shows at all is decided
 * before paint by the script in <head> (lib/announcement-gate.mjs); this component
 * dismisses it and keeps the height the sticky headers below it read up to date.
 */
export function AnnouncementBar({ announcement }: { announcement: Announcement }) {
  const { id, kind, message, linkText, href, linkPath, version } = announcement;
  const stripRef = useRef<HTMLElement>(null);
  const pathname = usePathname();

  function dismiss() {
    rememberDismissed(id);
    const strip = stripRef.current;
    if (!strip || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setVisibility("off");
      return;
    }
    // Collapse from the strip's real height, in step with the headers below it. The strip
    // has no max-height until now, so setting one is instant; reading the layout commits it
    // as the start of the transition to 0.
    strip.style.maxHeight = `${strip.offsetHeight}px`;
    strip.getBoundingClientRect();
    strip.style.maxHeight = "0px";
    strip.setAttribute("data-closing", "");
    setVisibility("closing");
    window.setTimeout(() => setVisibility("off"), COLLAPSE_MS);
  }

  // Reaching the linked page in the app, not only by a full page load, has done what it asked.
  useEffect(() => {
    if (pathname.replace(/\/+$/, "") !== linkPath) return;
    rememberDismissed(id);
    setVisibility("off");
  }, [pathname, linkPath, id]);

  useEffect(() => {
    const strip = stripRef.current;
    if (!strip) return;
    const root = document.documentElement;
    const observer = new ResizeObserver(() => {
      // Once hidden or closing, setVisibility owns the height.
      if (root.hasAttribute("data-cy-ann")) return;
      root.style.setProperty("--cy-ann-h", `${strip.offsetHeight}px`);
    });
    observer.observe(strip);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={stripRef}
      id="cy-ann"
      className="cy-ann"
      data-kind={kind}
      aria-label={REGION_LABEL[kind]}
    >
      <div className="cy-ann-motif" aria-hidden="true">
        <svg width="320" height="48" viewBox="0 0 320 48" aria-hidden="true">
          <defs>
            <pattern
              id="cy-ann-grid"
              width="8"
              height="8"
              x="-4"
              y="-4"
              patternUnits="userSpaceOnUse"
            >
              <circle className="cy-ann-dot" cx="4" cy="4" r="1" />
            </pattern>
          </defs>
          <rect x="-4" y="-4" width="328" height="56" fill="url(#cy-ann-grid)" />
          {MARK[kind].map(([cx, cy]) => (
            <circle key={`${cx}-${cy}`} className="cy-ann-mark" cx={cx} cy={cy} r="1.5" />
          ))}
        </svg>
      </div>
      <div className="cy-ann-inner">
        <div className="cy-ann-content">
          {version && <span className="cy-ann-pill">v{version}</span>}
          <span className="cy-ann-message">
            {message}
            <Link className="cy-ann-link" href={href} onClick={() => rememberDismissed(id)}>
              <span className="cy-ann-link-text">{linkText}</span>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path
                  d="M6 3.5L10.5 8L6 12.5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </Link>
          </span>
        </div>
        <button
          type="button"
          className="cy-ann-dismiss"
          aria-label="Dismiss announcement"
          onClick={dismiss}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path
              d="M5 5l10 10M15 5L5 15"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>
    </section>
  );
}

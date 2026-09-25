"use client";

import { useTheme } from "next-themes";
import { type MouseEvent, useEffect, useState } from "react";
import { flushSync } from "react-dom";

/**
 * The design's `#themeBtn` (docs.html:335/2195-2201) — a single-glyph square button
 * that shows the mode you would switch TO, not the current one: a moon while light,
 * a sun while dark. Uses `next-themes`' own `useTheme` (the same API Fumadocs'
 * `ThemeSwitch` is built on, transcribed above) so behaviour — persistence,
 * `RootProvider`'s `attribute="class"` wiring — is identical.
 *
 * `resolvedTheme` is undefined on the server and on the first client render (before
 * `next-themes` has read `localStorage`/`prefers-color-scheme`), so branching on it
 * directly would paint one icon on the server and possibly flip to the other the
 * instant the client hydrates — a hydration mismatch. `mounted` guards that: it is
 * `false` on both the server render and React's first client render (they must
 * match for hydration to succeed), so both paint the moon; only once mounted
 * flips `true` in a `useEffect` (client-only, after hydration is already complete)
 * does the icon reconcile with the real resolved theme. That is a plain post-mount
 * state update, not a hydration mismatch.
 */

/**
 * Switches the theme behind a circular reveal growing from the button.
 *
 * Transcribed from the design's `applyTheme(dark, animate, origin)`: the radius reaches
 * the furthest page corner from the click, and the position and radius are handed to the
 * `cyThemeReveal` keyframes through `--vt-x` / `--vt-y` / `--vt-r` on `:root`.
 *
 * Falls back to switching outright where `startViewTransition` is unavailable, and skips
 * the animation entirely for a reader who prefers reduced motion.
 */
function revealTheme(event: MouseEvent<HTMLButtonElement>, change: () => void): void {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduced || !document.startViewTransition) {
    change();
    return;
  }

  const rect = event.currentTarget.getBoundingClientRect();
  const x = rect.left + rect.width / 2;
  const y = rect.top + rect.height / 2;
  const radius = Math.hypot(
    Math.max(x, window.innerWidth - x),
    Math.max(y, window.innerHeight - y),
  );
  const diagonal = Math.hypot(window.innerWidth, window.innerHeight) / Math.SQRT2;

  const root = document.documentElement.style;
  root.setProperty("--vt-x", `${((x / window.innerWidth) * 100).toFixed(3)}%`);
  root.setProperty("--vt-y", `${((y / window.innerHeight) * 100).toFixed(3)}%`);
  root.setProperty("--vt-r", `${((radius / diagonal) * 100).toFixed(3)}%`);

  // `startViewTransition` snapshots the page, runs the callback, then snapshots again —
  // so the callback has to change the DOM *synchronously*. `setTheme` is a React state
  // update, which is not: without the flush the class lands after the second snapshot and
  // the reveal animates one frame against an identical one (verified — the class was
  // still unchanged when the callback returned).
  document.startViewTransition(() => {
    flushSync(change);
  });
}

export function ThemeToggle({ className }: { className: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = mounted && resolvedTheme === "dark";

  return (
    <button
      type="button"
      className={className}
      aria-label="Dark mode"
      aria-pressed={isDark}
      title="Toggle dark mode"
      onClick={(event) => revealTheme(event, () => setTheme(isDark ? "light" : "dark"))}
    >
      {isDark ? <SunIcon /> : <MoonIcon />}
    </button>
  );
}

/** Verbatim from `applyTheme()`'s light-mode branch (docs.html:2199) — a crescent moon. */
function MoonIcon() {
  return (
    <svg
      width="17"
      height="17"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path d="M21 13A9 9 0 1 1 11 3a7 7 0 0 0 10 10z" />
    </svg>
  );
}

/** Verbatim from `applyTheme()`'s dark-mode branch (docs.html:2200) — a sun. */
function SunIcon() {
  return (
    <svg
      width="17"
      height="17"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  );
}

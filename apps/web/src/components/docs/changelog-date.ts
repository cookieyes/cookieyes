/**
 * Changelog date formatting, shared by the client-side listing card
 * (`Changelog.tsx`) and the server-rendered release badges (`ReleaseNotes.tsx`).
 *
 * It lives in its own module precisely because of that split: `Changelog.tsx` is
 * `"use client"`, and every export of a client module becomes a client reference —
 * a server component importing this from there could not call it.
 */

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/**
 * "2026-08-17" -> "Aug 17, 2026", matching the prototype's `.cl-date` format
 * (docs.html renders "Jun 12, 2025", not an ISO string). Authors still write ISO
 * dates in the MDX — they sort correctly and carry no locale ambiguity — and the
 * display format is derived here. The ISO parts are read directly rather than via
 * `new Date(iso)` so the rendered day never shifts with the runtime's timezone.
 * A value that isn't a plain ISO calendar date is passed through untouched.
 */
export function formatChangelogDate(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return iso;
  const [, year, month, day] = match;
  const label = MONTHS[Number(month) - 1];
  if (!label || !year || !day) return iso;
  return `${label} ${Number(day)}, ${year}`;
}

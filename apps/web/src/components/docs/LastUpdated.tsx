/**
 * "Last updated {date}" with the design's calendar glyph.
 *
 * Fumadocs' PageLastUpdate renders "Last updated on {locale date}" with no icon and
 * formats client-side, which also risks a server/client mismatch. The design reads
 * "Last updated Jul 6, 2026" — no "on" — so this formats server-side with a fixed
 * locale and renders the design's icon.
 */
export function LastUpdated({ date }: { date: Date }) {
  const formatted = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);

  return (
    <span className="cy-doc-pmeta-item">
      <CalendarIcon />
      Last updated {formatted}
    </span>
  );
}

/**
 * The design's PM_ICONS.clock (docs.html:2022) — despite its own constant name, this glyph
 * is a calendar, not a clock: a rounded rect body with two tabs and a header rule. Named for
 * what it draws, not for the prototype's (now stale) variable name.
 */
function CalendarIcon() {
  return (
    <svg
      width="14"
      height="14"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <rect x="4" y="5" width="16" height="16" rx="2.5" />
      <path d="M16 3v4M8 3v4M4 11h16" />
    </svg>
  );
}

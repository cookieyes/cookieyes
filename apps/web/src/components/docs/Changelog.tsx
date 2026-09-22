"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatChangelogDate } from "./changelog-date";

interface ChangelogEntryProps {
  /** How the release is named, e.g. "18 September 2026". */
  version: string;
  /** ISO 8601 calendar date. Rendered via formatChangelogDate, and the page's slug. */
  date: string;
  /** Release qualifier shown beside the date. */
  kind?: "release" | "stable" | undefined;
  /** Optional headline, shown after the name. */
  title?: string | undefined;
  /**
   * One condensed line per change kind — a taste of the release, not its full
   * contents. Each `text` is a summary of that kind's bullets on the release page;
   * keep it to a single line and let the release page carry the detail, or the card
   * stops being a listing. Plain text only, no inline code.
   */
  highlights?: ChangelogHighlight[] | undefined;
}

interface ChangelogHighlight {
  /** "Added" | "Changed" | "Fixed" | "Breaking" | "Highlights" */
  kind: string;
  text: string;
}

/**
 * One row in the changelog listing: date, kind, a hover-revealed "Read release
 * notes" link, the version/title line, and one summary line per change kind. The
 * full detail lives only on the release page (`/docs/changelog/2026-09-18`) — the card
 * says what moved, the page says what it means.
 *
 * The card is an <article> with an onClick rather than a wrapping <a>: an anchor
 * can never legally nest another interactive element, and the visible,
 * keyboard-reachable affordance is the .cy-doc-cl-go <Link> inside it.
 */
export function ChangelogEntry({
  version,
  date,
  kind = "release",
  title,
  highlights,
}: ChangelogEntryProps) {
  const router = useRouter();
  // The release page is named by its date, which is also this card's slug.
  const href = `/docs/changelog/${date}`;

  return (
    /* biome-ignore lint/a11y/useKeyWithClickEvents: pointer-only convenience navigation —
       the real, keyboard-reachable affordance is the .cy-doc-cl-go <Link> inside this
       article, not this onClick handler. */
    <article
      className="cy-doc-cl-card"
      data-testid="changelog-card"
      data-version={version}
      onClick={(event) => {
        if ((event.target as HTMLElement).closest("a, button, code")) return;
        router.push(href);
      }}
    >
      <div className="cy-doc-cl-meta">
        <span className="cy-doc-cl-date">{formatChangelogDate(date)}</span>
        <span className="cy-doc-cl-kind">{kind}</span>
        <Link href={href} className="cy-doc-cl-go">
          Read release notes
          <ChevronRightIcon />
        </Link>
      </div>
      <div className="cy-doc-cl-title">{title ? `${version} — ${title}` : version}</div>
      {highlights?.length ? (
        <dl className="cy-doc-cl-hls">
          {highlights.map((highlight) => (
            <div className="cy-doc-cl-hl" key={`${highlight.kind}:${highlight.text}`}>
              <dt className="cy-doc-cl-grp">{highlight.kind}</dt>
              <dd className="cy-doc-cl-hl-text">{highlight.text}</dd>
            </div>
          ))}
        </dl>
      ) : null}
    </article>
  );
}

function ChevronRightIcon() {
  return (
    <svg
      width="12"
      height="12"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <polyline points="9 6 15 12 9 18" />
    </svg>
  );
}

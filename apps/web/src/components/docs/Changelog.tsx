"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type ReactNode, useState } from "react";
import { formatChangelogDate } from "./changelog-date";

/** "v1.4.0" -> "v1-4-0" — the release page's slug segment. */
function versionToSlug(version: string): string {
  return version.replace(/\./g, "-");
}

interface ChangelogEntryProps {
  /** Umbrella SDK version for this release, e.g. "v1.4.0". */
  version: string;
  /** ISO 8601 calendar date — rendered via formatChangelogDate. */
  date: string;
  /** Release qualifier shown beside the date. */
  kind?: "release" | "stable" | undefined;
  /** Headline for this release, without the version prefix. */
  title: string;
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
 * full detail lives only on the release page (`/docs/changelog/v1-4-0`) — the card
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
  const href = `/docs/changelog/${versionToSlug(version)}`;

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
      <div className="cy-doc-cl-title">
        {version} — {title}
      </div>
      {highlights?.length ? (
        <dl className="cy-doc-cl-hls">
          {highlights.map((highlight) => (
            <div className="cy-doc-cl-hl" key={highlight.kind}>
              <dt className="cy-doc-cl-grp">{highlight.kind}</dt>
              <dd className="cy-doc-cl-hl-text">{highlight.text}</dd>
            </div>
          ))}
        </dl>
      ) : null}
    </article>
  );
}

/**
 * The prototype's "Show earlier releases" fold (`.cl-more` / `showOlderCl`). Older
 * entries render only after a click, and the button then unmounts — the prototype
 * did the same with `btn.closest('.cl-more').remove()`.
 *
 * Wrap ONLY entry cards in this, never a month heading. Fumadocs builds "On this
 * page" from the MDX at build time, so a heading hidden behind the fold would still
 * be listed in the TOC while having no height in the document — which made
 * scroll-spy skip the month before it.
 */
export function ChangelogOlderReveal({ children }: { children: ReactNode }) {
  const [shown, setShown] = useState(false);

  if (shown) return <>{children}</>;

  return (
    <div className="cy-doc-cl-more">
      <button type="button" className="cy-doc-cl-more-btn" onClick={() => setShown(true)}>
        <span className="cy-doc-cl-more-label">Older</span>
        <span className="cy-doc-cl-more-title">Show earlier releases</span>
      </button>
    </div>
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

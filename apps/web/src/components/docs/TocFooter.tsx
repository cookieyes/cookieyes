"use client";

import { useState } from "react";

/**
 * The TOC footer from the design: a "Was this helpful?" vote followed by page
 * links. Rendered through DocsPage's `tableOfContent.footer` slot, so it sits under
 * the "On this page" list and scrolls with it.
 *
 * The vote is local-only. The design's own `fbVote` just marks the chosen button
 * and there is no endpoint behind it; wiring it to analytics is a follow-up, and
 * doing so means only replacing the body of `vote`.
 */
export function TocFooter({ editUrl, issueUrl }: { editUrl: string; issueUrl: string }) {
  const [voted, setVoted] = useState<"yes" | "no" | null>(null);

  return (
    <div className="cy-doc-tocft">
      <div className="cy-doc-toc-title">Was this helpful?</div>

      <div className="cy-doc-fb-row">
        <button
          type="button"
          className="cy-doc-fb-b"
          data-picked={voted === "yes"}
          aria-pressed={voted === "yes"}
          onClick={() => setVoted("yes")}
        >
          <ThumbUpIcon />
          Yes
        </button>
        <button
          type="button"
          className="cy-doc-fb-b"
          data-picked={voted === "no"}
          aria-pressed={voted === "no"}
          onClick={() => setVoted("no")}
        >
          <ThumbDownIcon />
          No
        </button>
      </div>

      <div className="cy-doc-tocft-links">
        <a className="cy-doc-tocft-a" href={editUrl} target="_blank" rel="noreferrer noopener">
          <PencilIcon />
          Edit page
        </a>
        <a className="cy-doc-tocft-a" href={issueUrl} target="_blank" rel="noreferrer noopener">
          <BellIcon />
          Report issue
        </a>
      </div>
    </div>
  );
}

function ThumbUpIcon() {
  return (
    <svg
      width="14"
      height="14"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path d="M7 11v9H4a1 1 0 0 1-1-1v-7a1 1 0 0 1 1-1h3zm0 0l4-8a2.5 2.5 0 0 1 2.5 2.5V9H19a2 2 0 0 1 2 2.3l-1 6.5A2 2 0 0 1 18 20H7" />
    </svg>
  );
}

function ThumbDownIcon() {
  return (
    <svg
      width="14"
      height="14"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path d="M17 13V4h3a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1h-3zm0 0l-4 8a2.5 2.5 0 0 1-2.5-2.5V15H5a2 2 0 0 1-2-2.3l1-6.5A2 2 0 0 1 6 4h11" />
    </svg>
  );
}

function PencilIcon() {
  return (
    <svg
      width="13"
      height="13"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path d="M17 3a2.8 2.8 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
    </svg>
  );
}

/** The design's "Report issue" mark is a bell, not the GitHub octocat
 *  (docs.html:1867). Paths transcribed verbatim from the prototype. */
function BellIcon() {
  return (
    <svg
      width="15"
      height="15"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path d="M10 5a2 2 0 1 1 4 0a7 7 0 0 1 4 6v3a4 4 0 0 0 2 3H4a4 4 0 0 0 2 -3v-3a7 7 0 0 1 4 -6" />
      <path d="M9 17v1a3 3 0 0 0 6 0v-1" />
    </svg>
  );
}

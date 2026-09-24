/**
 * The TOC footer: the page links, under the "On this page" list, scrolling with it.
 *
 * The design also puts a "Was this helpful?" vote here. It is not reproduced — there is
 * no endpoint behind it, so it asked a question and discarded the answer.
 */
export function TocFooter({ editUrl, issueUrl }: { editUrl: string; issueUrl: string }) {
  return (
    <div className="cy-doc-tocft">
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

"use client";

import { forwardRef, useCallback, useImperativeHandle, useRef, useState } from "react";

type LoadState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; text: string }
  | { status: "error" };

export interface ViewMarkdownDialogHandle {
  open: () => void;
}

/**
 * "View as Markdown" overlay — the design's .mdov / .mdbx (docs.html:181-187).
 *
 * Built on the native <dialog> element rather than a popover library: it gives the
 * modal behaviour the design implies (focus trap, Escape to dismiss, inert
 * background, a ::backdrop to tint) without pulling in a dependency this app does
 * not already have. The design's overlay div maps onto ::backdrop and its .mdbx box
 * onto the dialog itself.
 *
 * Tier D (docs.html:157-179, the .pm-split split-button) is this component's only
 * caller and supplies its own trigger — the "View as Markdown" row inside
 * .cy-doc-pm-menu — rather than a standalone button rendered by this component, as
 * the earlier placeholder version did. This component renders ONLY the <dialog> now,
 * exposing `open()` via `ref` so any trigger can drive it. This is the only change
 * versus the version Tiers A-C shipped — the dialog's own markup, classes, and
 * fetch/cache behaviour are untouched. See design doc content-tier-d.md §5.1.
 *
 * The content is the raw file served by /api/md, not a re-serialisation of the
 * rendered page, so frontmatter and code fences survive — which is the point of
 * showing it. It is fetched on first open and kept for subsequent opens.
 */
export const ViewMarkdownDialog = forwardRef<ViewMarkdownDialogHandle, { markdownUrl: string }>(
  function ViewMarkdownDialog({ markdownUrl }, ref) {
    const dialogRef = useRef<HTMLDialogElement>(null);
    const [state, setState] = useState<LoadState>({ status: "idle" });

    const open = useCallback(async () => {
      dialogRef.current?.showModal();
      if (state.status === "ready" || state.status === "loading") return;

      setState({ status: "loading" });
      try {
        const response = await fetch(markdownUrl);
        if (!response.ok) throw new Error(`${response.status}`);
        setState({ status: "ready", text: await response.text() });
      } catch {
        setState({ status: "error" });
      }
    }, [markdownUrl, state.status]);

    useImperativeHandle(ref, () => ({ open }), [open]);

    const close = useCallback(() => dialogRef.current?.close(), []);

    // The dialog fills the viewport; a click landing on it rather than on the panel
    // inside is a backdrop click.
    const onDialogClick = useCallback(
      (event: React.MouseEvent<HTMLDialogElement>) => {
        if (event.target === dialogRef.current) close();
      },
      [close],
    );

    return (
      <>
        {/* biome-ignore lint/a11y/useKeyWithClickEvents: <dialog> handles Escape and
            focus itself; this click only adds click-outside-to-close on the backdrop,
            which the header's close button already covers for keyboard users. */}
        <dialog ref={dialogRef} className="cy-doc-mdov" onClick={onDialogClick}>
          <div className="cy-doc-mdbx">
            <div className="cy-doc-mdbx-hd">
              <span>Markdown</span>
              <button type="button" className="cy-doc-mdbx-x" onClick={close}>
                esc close
              </button>
            </div>
            <pre className="cy-doc-mdbx-pre">
              {state.status === "ready"
                ? state.text
                : state.status === "error"
                  ? "Could not load the Markdown for this page."
                  : "Loading…"}
            </pre>
          </div>
        </dialog>
      </>
    );
  },
);

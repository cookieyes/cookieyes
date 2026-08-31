"use client";

import {
  type KeyboardEvent as ReactKeyboardEvent,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { writeToClipboard } from "./clipboard";
import { ViewMarkdownDialog, type ViewMarkdownDialogHandle } from "./ViewMarkdownDialog";

type CopyState = "idle" | "loading" | "copied" | "error";

/**
 * The design's .pm-split split-button + .pm-menu dropdown (docs.html:157-179,
 * behaviour docs.html:2020-2109). Replaces the two plain action buttons
 * content-tier-a.md's `.cy-doc-page-actions` seam held as a placeholder.
 *
 * This is a bespoke component, not a wrapper around Fumadocs' own
 * `MarkdownCopyButton`: that hook drives exactly one `checked` boolean for exactly
 * one caller, but this design needs ONE shared copy-state driving TWO elements at
 * once — `.pm-main`'s label/icon swap AND the `.pm-row-copy` menu row's text swap —
 * that change and revert together. Wrapping two separate `MarkdownCopyButton`s would
 * mean two independent fetches, two independent clipboard writes, and two
 * independent timers that could visibly desync, which is the opposite of the
 * design's "both change and revert as one" behaviour. See design doc
 * content-tier-d.md §2.7 for the full comparison.
 *
 * Ships two menu rows only (Copy as Markdown, View as Markdown) — the prototype's
 * third row ("Agent setup", docs.html:2151-2155) links to an `ai-agents` page that
 * does not exist in this docs tree; a seam for it is marked below. The prototype's
 * `pg.id === 'pg-changelog' ? '' : ...` conditional, which existed only to hide that
 * third row on one page, is not ported — with two rows shipped everywhere, it has
 * no purpose. See design doc content-tier-d.md §1/§2.3-2.8 for every other decision
 * this component makes versus the prototype (accessibility pattern, click-outside
 * handling, width-pinning, and a verified prototype colour bug it does NOT
 * reproduce).
 */
export function PmSplit({ markdownUrl }: { markdownUrl: string }) {
  const [open, setOpen] = useState(false);
  const [copyState, setCopyState] = useState<CopyState>("idle");

  const rootRef = useRef<HTMLDivElement>(null);
  const caretRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const viewDialogRef = useRef<ViewMarkdownDialogHandle>(null);
  const cachedMarkdown = useRef<string | null>(null);
  const copyTimeoutRef = useRef<number | null>(null);

  const menuId = useId();

  const fetchMarkdown = useCallback(async () => {
    if (cachedMarkdown.current !== null) return cachedMarkdown.current;
    const response = await fetch(markdownUrl);
    if (!response.ok) throw new Error(`Failed to load markdown: ${response.status}`);
    const text = await response.text();
    cachedMarkdown.current = text;
    return text;
  }, [markdownUrl]);

  // Drives BOTH .cy-doc-pm-main and .cy-doc-pm-row-copy from one state, so they
  // change and revert together (docs.html:2049-2068's `[main, row].forEach`).
  const handleCopy = useCallback(async () => {
    if (copyTimeoutRef.current !== null) window.clearTimeout(copyTimeoutRef.current);
    setCopyState("loading");
    try {
      const text = await fetchMarkdown();
      await writeToClipboard(text);
      setCopyState("copied");
    } catch {
      setCopyState("error");
    } finally {
      // 2000ms, transcribed from docs.html:2066.
      copyTimeoutRef.current = window.setTimeout(() => setCopyState("idle"), 2000);
    }
  }, [fetchMarkdown]);

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current !== null) window.clearTimeout(copyTimeoutRef.current);
    };
  }, []);

  const closeMenu = useCallback(() => setOpen(false), []);

  const handleViewMarkdown = useCallback(() => {
    // docs.html:2103-2108's viewPageMd() also closes the menu before opening the
    // overlay; copyPageMd() (above) deliberately does NOT close it, so the row can
    // show its own "Copied to clipboard" feedback in place.
    closeMenu();
    viewDialogRef.current?.open();
  }, [closeMenu]);

  // Click-outside-to-close, scoped to this instance — see design doc §2.3 for why
  // this removes the need for the prototype's 250ms timing guard entirely.
  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (rootRef.current?.contains(event.target as Node)) return;
      setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  // Escape closes the menu and returns focus to the caret (docs.html:2101 only
  // closes; it never manages focus at all).
  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        caretRef.current?.focus();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  // Move focus to the first row when the menu opens (WAI-ARIA menu-button pattern).
  useEffect(() => {
    if (!open) return;
    menuRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
  }, [open]);

  const handleCaretKeyDown = useCallback((event: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      setOpen(true);
    }
  }, []);

  const handleMenuKeyDown = useCallback((event: ReactKeyboardEvent<HTMLDivElement>) => {
    const items = Array.from(
      menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [],
    );
    if (items.length === 0) return;
    const index = items.indexOf(document.activeElement as HTMLElement);
    if (event.key === "ArrowDown") {
      event.preventDefault();
      items[(index + 1) % items.length]?.focus();
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      items[(index - 1 + items.length) % items.length]?.focus();
    }
  }, []);

  const copied = copyState === "copied";

  return (
    <div className="cy-doc-pm-split" data-open={open || undefined} ref={rootRef}>
      <button
        type="button"
        className="cy-doc-pm-main"
        data-copied={copied || undefined}
        onClick={handleCopy}
      >
        <span className="cy-doc-pm-main-stack" aria-live="polite">
          <span className="cy-doc-pm-main-state" data-active={!copied}>
            <CopyIcon />
            <span>Copy as Markdown</span>
          </span>
          <span className="cy-doc-pm-main-state" data-active={copied}>
            <CheckIcon />
            <span>Copied</span>
          </span>
        </span>
      </button>

      <button
        type="button"
        ref={caretRef}
        className="cy-doc-pm-caret"
        aria-label="More page actions"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((value) => !value)}
        onKeyDown={handleCaretKeyDown}
      >
        <ChevronIcon />
      </button>

      <div
        id={menuId}
        ref={menuRef}
        role="menu"
        aria-label="Page actions"
        className="cy-doc-pm-menu"
        data-open={open || undefined}
        onKeyDown={handleMenuKeyDown}
      >
        <button
          type="button"
          role="menuitem"
          className="cy-doc-pm-row cy-doc-pm-row-copy"
          data-copied={copied || undefined}
          onClick={handleCopy}
        >
          <span className="cy-doc-pm-tile">
            <CopyLgIcon />
          </span>
          <span className="cy-doc-pm-tx">
            <span className="cy-doc-pm-t">
              {copied ? "Copied to clipboard" : "Copy as Markdown"}
            </span>
            <span className="cy-doc-pm-d">Copy this page for LLM context</span>
          </span>
        </button>

        <button
          type="button"
          role="menuitem"
          className="cy-doc-pm-row"
          onClick={handleViewMarkdown}
        >
          <span className="cy-doc-pm-tile">
            <EyeIcon />
          </span>
          <span className="cy-doc-pm-tx">
            <span className="cy-doc-pm-t">
              View as Markdown
              <ExternalIcon />
            </span>
            <span className="cy-doc-pm-d">View this page as plain text</span>
          </span>
        </button>

        {/* Tier D seam: a third row — "Agent setup" / "Install SKILL.md files for
            your agent" (docs.html:2151-2155), linking to `nav('ai-agents')` — is
            NOT shipped (design doc §1: no `ai-agents` page exists in this docs
            tree). Add it here, same shape as the two rows above, once that page
            exists:
              <button type="button" role="menuitem" className="cy-doc-pm-row" onClick={...}>
                <span className="cy-doc-pm-tile"><GearIcon /></span>
                <span className="cy-doc-pm-tx">
                  <span className="cy-doc-pm-t">Agent setup<ExternalIcon /></span>
                  <span className="cy-doc-pm-d">Install SKILL.md files for your agent</span>
                </span>
              </button> */}
      </div>

      <ViewMarkdownDialog ref={viewDialogRef} markdownUrl={markdownUrl} />
    </div>
  );
}

function CopyIcon() {
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
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M5 15V6a2 2 0 0 1 2-2h9" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      width="13"
      height="13"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <polyline points="5 13 9.5 17.5 19 7" />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg
      width="15"
      height="15"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function CopyLgIcon() {
  return (
    <svg
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <rect x="9" y="9" width="11" height="11" rx="2.5" />
      <path d="M5 15V6.5A2.5 2.5 0 0 1 7.5 4H16" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="2.5" />
      <path d="M21 12c-2.4 3.8-5.4 5.7-9 5.7S5.4 15.8 3 12c2.4-3.8 5.4-5.7 9-5.7s6.6 1.9 9 5.7z" />
    </svg>
  );
}

function ExternalIcon() {
  return (
    <svg
      width="12"
      height="12"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path d="M13 5h6v6" />
      <path d="M19 5l-8 8" />
      <path d="M18 14v4a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 4 18V7a1.5 1.5 0 0 1 1.5-1.5H10" />
    </svg>
  );
}

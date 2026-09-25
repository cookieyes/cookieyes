"use client";

import { useDocsSearch } from "fumadocs-core/search/client";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { useSearchIndex } from "@/components/docs/search-index-context";
import { DEFAULT_FRAMEWORK, frameworkOf } from "@/lib/framework-docs";
import type { SearchIndexEntry } from "@/lib/search-index";

interface SearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface Row extends SearchIndexEntry {
  key: string;
}

/**
 * Search modal, transcribed from the landing design's search overlay.
 *
 * Fumadocs' own dialog could not be restyled into this: its result list is a page
 * row followed by indented heading/text matches, whereas the design shows one row
 * per page carrying a title, a description and a section label. Description and
 * section are not in the search payload at all, so they come from `pageIndex`,
 * built server-side in lib/search-index.
 *
 * Search itself still goes through Fumadocs — useDocsSearch against the same
 * /api/search route — so only the presentation is ours.
 */
export function SearchDialog({ open, onOpenChange }: SearchDialogProps) {
  const router = useRouter();
  const pathname = usePathname();
  // Results stay inside the root the reader is in — a JavaScript reader is not offered
  // React hooks, and the changelog searches only itself. Pages are tagged with their root
  // in app/api/search/route.ts. One tag, not a list: the fetch client sends a list as a
  // single comma-joined value, which no page carries.
  const tag = pathname.startsWith("/docs/changelog")
    ? "changelog"
    : (frameworkOf(pathname) ?? DEFAULT_FRAMEWORK);
  const pageIndex = useSearchIndex().filter((entry) => entry.url.split("/")[2] === tag);
  const { search, setSearch, query } = useDocsSearch({ type: "fetch", tag });
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const labelId = useId();

  const byUrl = useMemo(() => {
    const map = new Map<string, SearchIndexEntry>();
    for (const entry of pageIndex) map.set(entry.url, entry);
    return map;
  }, [pageIndex]);

  /**
   * One row per page, in result order.
   *
   * A query can match a page's title, a heading and body text, which Fumadocs
   * returns as separate results sharing a url. The design shows a page once, so
   * they collapse to the first hit — which keeps recall (a body-only match still
   * surfaces its page) while matching the design's list.
   */
  const rows = useMemo<Row[]>(() => {
    const results = query.data;
    const source: SearchIndexEntry[] =
      !results || results === "empty"
        ? pageIndex
        : (() => {
            const seen = new Set<string>();
            const out: SearchIndexEntry[] = [];
            for (const result of results) {
              const url = result.url.split("#")[0] ?? result.url;
              if (seen.has(url)) continue;
              seen.add(url);
              const entry = byUrl.get(url);
              if (entry) out.push(entry);
            }
            return out;
          })();

    return source.map((entry) => ({ ...entry, key: entry.url }));
  }, [query.data, byUrl, pageIndex]);

  // Reset the highlight whenever the result set changes under it.
  useEffect(() => setActive(0), []);

  const close = useCallback(() => onOpenChange(false), [onOpenChange]);

  const go = useCallback(
    (url: string) => {
      close();
      router.push(url);
    },
    [close, router],
  );

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
        return;
      }
      // Modal: Tab and Shift+Tab cycle through the dialog's own controls, never the page
      // behind it.
      if (event.key === "Tab") {
        const focusable = boxRef.current?.querySelectorAll<HTMLElement>("input, button");
        const first = focusable?.[0];
        const last = focusable?.[focusable.length - 1];
        if (!first || !last) return;
        const inside = boxRef.current?.contains(document.activeElement);
        if (event.shiftKey && (document.activeElement === first || !inside)) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && (document.activeElement === last || !inside)) {
          event.preventDefault();
          first.focus();
        }
        return;
      }
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        setActive((current) => {
          if (rows.length === 0) return 0;
          const next = event.key === "ArrowDown" ? current + 1 : current - 1;
          return (next + rows.length) % rows.length;
        });
        return;
      }
      if (event.key === "Enter") {
        const row = rows[active];
        if (row) {
          event.preventDefault();
          go(row.url);
        }
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, rows, active, close, go]);

  // Keep the highlighted row in view when moving through a long list.
  useEffect(() => {
    listRef.current?.children[active]?.scrollIntoView({ block: "nearest" });
  }, [active]);

  // Focus the query field when the modal opens. Done here rather than with
  // autoFocus so it fires on open rather than on mount, and never steals focus
  // during hydration.
  // Closing hands focus back to whatever opened the dialog — the Search button, or the
  // element that had focus when ⌘K was pressed — instead of dropping it on <body>.
  useEffect(() => {
    if (!open) return;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    inputRef.current?.focus();
    return () => {
      if (opener?.isConnected) opener.focus();
    };
  }, [open]);

  // Restore body scroll handling: the overlay covers the page while open.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  if (!open) return null;

  return (
    /* The backdrop. Click-to-dismiss is a pointer convenience layered on top of the
       accessible paths — Escape and the esc button — not the only way out, and a
       backdrop is not itself a control that should take focus. */
    // biome-ignore lint/a11y/noStaticElementInteractions: modal backdrop, see above
    <div
      className="cy-search-ov"
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      <div
        ref={boxRef}
        className="cy-search-box"
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelId}
      >
        <h2 className="cy-search-a11y-title" id={labelId}>
          Search docs
        </h2>

        <div className="cy-search-query">
          <SearchIcon />
          <input
            ref={inputRef}
            className="cy-search-input"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setActive(0);
            }}
            placeholder="Search docs…"
            aria-label="Search docs"
            aria-controls={`${labelId}-results`}
          />
          <button type="button" className="cy-search-esc" onClick={close}>
            esc
          </button>
        </div>

        <div className="cy-search-section">{search ? "Results" : "All pages"}</div>

        <div className="cy-search-results" id={`${labelId}-results`} ref={listRef} role="listbox">
          {rows.map((row, index) => (
            <button
              type="button"
              key={row.key}
              role="option"
              aria-selected={index === active}
              className="cy-search-row"
              data-active={index === active}
              onMouseEnter={() => setActive(index)}
              onClick={() => go(row.url)}
            >
              <span className="cy-search-row-main">
                <span className="cy-search-row-title">{row.title}</span>
                {row.description ? (
                  <span className="cy-search-row-desc">{row.description}</span>
                ) : null}
              </span>
              {row.category ? <span className="cy-search-row-cat">{row.category}</span> : null}
            </button>
          ))}

          {rows.length === 0 ? (
            <div className="cy-search-empty">no results. Try another term</div>
          ) : null}
        </div>

        {/* Keyboard legend. Sits outside the results container so it stays pinned
            while the list scrolls, as in the design. */}
        <div className="cy-search-hints">
          <span>↑↓ navigate</span>
          <span>↵ open</span>
          <span>esc close</span>
        </div>
      </div>
    </div>
  );
}

/** The design's 16px search glyph. */
function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5" />
      <line x1="11" y1="11" x2="14.5" y2="14.5" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

export default SearchDialog;

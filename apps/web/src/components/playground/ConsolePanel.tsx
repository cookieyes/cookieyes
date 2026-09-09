"use client";

import { useEffect, useRef } from "react";
import type { LogEntry } from "./playground-config";

/**
 * A running log of what the SDK actually did.
 *
 * The one question a developer has is whether their tags really stop before consent, and a
 * status table asks to be believed. A timestamped stream of events reads as monitoring, and
 * every line is earned: `allowed` is written by a script's own load callback, `blocked` by
 * the consent snapshot holding it back. Nothing is inferred, and no vendor is named that
 * this page does not actually load.
 *
 * Layout and colours follow the design's console.
 */
export function ConsolePanel({
  entries,
  cleared,
  onClear,
}: {
  entries: LogEntry[];
  cleared: boolean;
  onClear: () => void;
}) {
  const rows = useRef<HTMLOListElement>(null);

  // Follow the tail, the way a console does — but only while the visitor is already at the
  // bottom, so scrolling back to read an earlier line does not get yanked away.
  useEffect(() => {
    const el = rows.current;
    if (!el || entries.length === 0) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
    if (atBottom) el.scrollTop = el.scrollHeight;
  }, [entries]);

  return (
    <section className="cy-pg-console" aria-label="Consent event log">
      <header className="cy-pg-console-head">
        <h3>Console</h3>
        <p>Use the banner above and watch what your tags do.</p>
        <button type="button" onClick={onClear} disabled={entries.length === 0}>
          Clear
        </button>
      </header>

      {/* A log a screen reader reads line by line as it grows would talk over the visitor
          using the banner, so it is a plain region they can go and read instead. */}
      <ol className="cy-pg-console-rows" role="log" ref={rows}>
        {entries.map((entry) => (
          <li key={entry.seq} data-seq={entry.seq} data-level={entry.level}>
            <span className="cy-pg-log-time">{entry.time}</span>
            <span className="cy-pg-log-level">{entry.level}</span>
            <span className="cy-pg-log-msg">{entry.message}</span>
            <span className="cy-pg-log-meta">{entry.meta}</span>
          </li>
        ))}
        {/* Two states, because they mean different things: nothing has happened yet, versus
            you emptied it and the next thing you do will show up here. */}
        {entries.length === 0 ? (
          <li className="cy-pg-log-empty">
            <span className="cy-pg-log-empty-head">
              {cleared ? "Console cleared" : "No entries"}
            </span>
            <span className="cy-pg-log-empty-sub">
              {cleared
                ? "Accept, reject or save a choice in the preview and every tag reports back here."
                : "Waiting for the preview to load."}
            </span>
          </li>
        ) : null}
      </ol>
    </section>
  );
}

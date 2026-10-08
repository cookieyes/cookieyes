"use client";

import { type ReactNode, useMemo, useState } from "react";
import { downloadJson, timestampedFilename } from "../../lib/download-json.js";
import { formatTimestamp } from "../../lib/format-timestamp.js";
import type { EventRow } from "../../types.js";
import { Icon } from "../Icon.js";

export type EventsTabProps = {
  events: EventRow[];
  /** Clears the event list (and its sessionStorage copy); hidden when absent. */
  onClear?: (() => void) | undefined;
};

type Filter = "all" | EventRow["kind"];

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "consent", label: "Consent" },
  { id: "integration", label: "Integration" },
  { id: "blocked", label: "Blocked" },
];

function summarize(event: EventRow): string {
  switch (event.kind) {
    case "consent":
      return event.changedCategories.length > 0
        ? `${event.action} (${event.changedCategories.join(", ")})`
        : event.action;
    case "integration":
      return `${event.id} → ${event.status}`;
    case "blocked":
      return `${event.method} ${event.url}`;
    default:
      return "";
  }
}

/** The event's own fields, without the panel's bookkeeping. */
function payloadOf(event: EventRow): Record<string, unknown> {
  const { previous: _previous, ...rest } = event;
  return rest;
}

/**
 * Capped, interleaved timeline of consent save/change events, integration
 * status changes and blocked requests, oldest first. Filter by kind, search
 * the text and payload, and select a row to expand its JSON. Events from before
 * the last reload (kept in sessionStorage) sit under a divider.
 */
export function EventsTab({ events, onClear }: EventsTabProps) {
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<number | undefined>(undefined);

  const counts = useMemo(() => {
    const c: Record<Filter, number> = {
      all: events.length,
      consent: 0,
      integration: 0,
      blocked: 0,
    };
    for (const e of events) c[e.kind] += 1;
    return c;
  }, [events]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return events
      .map((event, index) => ({ event, index }))
      .filter(({ event }) => filter === "all" || event.kind === filter)
      .filter(
        ({ event }) =>
          !q ||
          summarize(event).toLowerCase().includes(q) ||
          JSON.stringify(payloadOf(event)).toLowerCase().includes(q),
      );
  }, [events, filter, query]);

  const firstCurrent = visible.findIndex(({ event }) => !event.previous);
  const hasPrevious = visible.some(({ event }) => event.previous);

  let list: ReactNode;
  if (events.length === 0) list = <p className="cyd-empty">No events recorded yet.</p>;
  else if (visible.length === 0) list = <p className="cyd-empty">No events match.</p>;
  else {
    list = (
      <ul className="cyd-list cyd-list-select">
        {visible.map(({ event, index }, i) => (
          <li
            // biome-ignore lint/suspicious/noArrayIndexKey: events of different kinds can share a timestamp
            key={`${event.kind}-${event.timestamp}-${index}`}
            className="cyd-list-item"
          >
            {hasPrevious && i === firstCurrent ? (
              <div className="cyd-divider">Page reloaded</div>
            ) : null}
            <button
              type="button"
              className={`cyd-list-row${selected === index ? " cyd-list-row-selected" : ""}${event.previous ? " cyd-list-row-previous" : ""}`}
              data-cyd-part="event-row"
              data-cyd-kind={event.kind}
              aria-pressed={selected === index}
              onClick={() => setSelected(selected === index ? undefined : index)}
            >
              <span className="cyd-list-time">{formatTimestamp(event.timestamp)}</span>
              <span className={`cyd-tag cyd-tag-${event.kind}`}>{event.kind}</span>
              <span className="cyd-list-summary">{summarize(event)}</span>
            </button>
            {selected === index ? (
              <div className="cyd-payload" data-cyd-part="event-payload">
                <pre className="cyd-pre">{JSON.stringify(payloadOf(event), null, 2)}</pre>
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div className="cyd-tab-panel" data-cyd-part="events-tab">
      <div className="cyd-toolbar">
        <fieldset className="cyd-chips">
          <legend className="cyd-sr">Filter events</legend>
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              className={`cyd-chip-btn${filter === f.id ? " cyd-chip-btn-active" : ""}`}
              aria-pressed={filter === f.id}
              data-cyd-part={`events-filter-${f.id}`}
              onClick={() => setFilter(f.id)}
            >
              {f.label}
              <span className="cyd-chip-count">{counts[f.id]}</span>
            </button>
          ))}
        </fieldset>
        <div className="cyd-toolbar-actions">
          <button
            type="button"
            className="cyd-btn cyd-btn-sm"
            data-cyd-part="events-export"
            disabled={events.length === 0}
            onClick={() =>
              downloadJson(timestampedFilename("cookieyes-events"), events.map(payloadOf))
            }
          >
            <Icon name="download" />
            Export
          </button>
          {onClear ? (
            <button
              type="button"
              className="cyd-btn cyd-btn-sm"
              data-cyd-part="events-clear"
              disabled={events.length === 0}
              onClick={() => {
                setSelected(undefined);
                onClear();
              }}
            >
              <Icon name="trash" />
              Clear
            </button>
          ) : null}
        </div>
      </div>

      <label className="cyd-search">
        <Icon name="search" />
        <input
          type="search"
          className="cyd-search-input"
          placeholder="Search events and payloads"
          aria-label="Search events"
          data-cyd-part="events-search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </label>

      {list}
    </div>
  );
}

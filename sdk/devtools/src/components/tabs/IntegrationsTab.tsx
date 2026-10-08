"use client";

import type { IntegrationDebugInfo } from "@cookieyes/core";
import { useState } from "react";
import { Icon } from "../Icon.js";

export type IntegrationsTabProps = {
  integrations: IntegrationDebugInfo[];
};

const STATUS_ORDER = ["active", "loading", "idle", "silenced", "removed", "error"] as const;

/** Configured integrations with live status, a per-status summary and a filter. */
export function IntegrationsTab({ integrations }: IntegrationsTabProps) {
  const [query, setQuery] = useState("");

  if (integrations.length === 0) {
    return (
      <div className="cyd-tab-panel" data-cyd-part="integrations-tab">
        <p className="cyd-empty">No integrations configured.</p>
      </div>
    );
  }

  const counts = new Map<string, number>();
  for (const entry of integrations) counts.set(entry.status, (counts.get(entry.status) ?? 0) + 1);
  const q = query.trim().toLowerCase();
  const categoryText = (entry: IntegrationDebugInfo) =>
    Array.isArray(entry.category) ? entry.category.join(" + ") : entry.category;
  const visible = q
    ? integrations.filter(
        (e) =>
          e.id.toLowerCase().includes(q) ||
          categoryText(e).toLowerCase().includes(q) ||
          e.status.includes(q),
      )
    : integrations;

  return (
    <div className="cyd-tab-panel" data-cyd-part="integrations-tab">
      <div className="cyd-toolbar">
        <div className="cyd-summary" data-cyd-part="integrations-summary">
          {STATUS_ORDER.filter((s) => counts.has(s)).map((s) => (
            <span key={s} className={`cyd-status cyd-status-${s}`}>
              {counts.get(s)} {s}
            </span>
          ))}
        </div>
        {integrations.length > 4 ? (
          <label className="cyd-search cyd-search-inline">
            <Icon name="search" />
            <input
              type="search"
              className="cyd-search-input"
              placeholder="Filter"
              aria-label="Filter integrations"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
        ) : null}
      </div>
      <div className="cyd-table-wrap">
        <table className="cyd-table">
          <thead>
            <tr>
              <th>Id</th>
              <th>Category</th>
              <th>Load</th>
              <th>On revoke</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((entry) => (
              <tr key={entry.id} data-cyd-part={`integration-row-${entry.id}`}>
                <td className="cyd-code">{entry.id}</td>
                <td>{categoryText(entry)}</td>
                <td>{entry.load === "immediately" ? "immediately" : "after consent"}</td>
                <td>{entry.onRevoke}</td>
                <td data-cyd-part={`integration-row-${entry.id}-status`}>
                  <span className={`cyd-status cyd-status-${entry.status}`}>{entry.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {visible.length === 0 ? <p className="cyd-note">No integration matches “{query}”.</p> : null}
    </div>
  );
}

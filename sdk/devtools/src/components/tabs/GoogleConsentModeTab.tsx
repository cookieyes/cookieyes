"use client";

import type { GoogleConsentSignal } from "@cookieyes/react";
import { formatTimestamp } from "../../lib/format-timestamp.js";
import type { DevGcmRecord } from "../../types.js";

export type GoogleConsentModeTabProps = {
  current: Record<GoogleConsentSignal, "granted" | "denied">;
  history: DevGcmRecord[];
};

const SIGNAL_ORDER: GoogleConsentSignal[] = [
  "ad_storage",
  "ad_user_data",
  "ad_personalization",
  "analytics_storage",
  "functionality_storage",
  "personalization_storage",
  "security_storage",
];

/**
 * The current 7-signal table, plus a record history.
 *
 * Rendered oldest-first (not reverse-chronological, despite the design doc's
 * §5 prose): the acceptance test for the server-snippet default (§9 test 16)
 * pins the *first* DOM row to the *oldest* record — the one reconstructed
 * from `window.dataLayer` at mount, before any later push — and test 17 pins
 * a newly-appended push as the newest entry. Oldest-first is the only order
 * that satisfies both, and is also the more natural reading order for "what
 * happened, in sequence" history list.
 */
export function GoogleConsentModeTab({ current, history }: GoogleConsentModeTabProps) {
  const oldestFirst = history;
  return (
    <div className="cyd-tab-panel" data-cyd-part="gcm-tab">
      <h4 className="cyd-subheading cyd-subheading-first">Google Consent Mode · current signals</h4>
      <div className="cyd-signal-grid">
        {SIGNAL_ORDER.map((signal) => (
          <div
            key={signal}
            className={`cyd-signal cyd-signal-${current[signal]}`}
            data-cyd-part={`gcm-signal-${signal}`}
          >
            <span className="cyd-signal-name">{signal}</span>
            <span className={`cyd-status cyd-status-${current[signal]}`}>{current[signal]}</span>
          </div>
        ))}
      </div>

      <h4 className="cyd-subheading">History</h4>
      {oldestFirst.length === 0 ? (
        <p className="cyd-empty">No Consent Mode pushes recorded yet.</p>
      ) : (
        <ul className="cyd-list">
          {oldestFirst.map((record, i) => (
            <li
              // biome-ignore lint/suspicious/noArrayIndexKey: records can share a timestamp; index disambiguates
              key={`${record.timestamp}-${i}`}
              className="cyd-list-row"
              data-cyd-part="gcm-record-row"
            >
              <span className="cyd-list-time">{formatTimestamp(record.timestamp)}</span>
              <span className="cyd-tag cyd-tag-consent" data-cyd-part="gcm-record-trigger">
                {record.trigger}
              </span>
              <span className="cyd-tag" data-cyd-part="gcm-record-source">
                {record.source}
              </span>
              <span className="cyd-list-detail cyd-list-rule">
                {Object.values(record.signals).filter((v) => v === "granted").length}/
                {SIGNAL_ORDER.length} granted
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

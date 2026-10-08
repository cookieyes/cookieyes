"use client";

import { formatTimestamp } from "../../lib/format-timestamp.js";
import type { DevBlockedRequestEvent } from "../../types.js";

export type BlockedRequestsTabProps = {
  requests: DevBlockedRequestEvent[];
};

/** Reverse-chronological list of blocked requests (capped — see useDevRuntimeData). */
export function BlockedRequestsTab({ requests }: BlockedRequestsTabProps) {
  if (requests.length === 0) {
    return (
      <div className="cyd-tab-panel" data-cyd-part="blocked-tab">
        <p className="cyd-empty">No requests blocked yet.</p>
      </div>
    );
  }
  const newestFirst = [...requests].reverse();
  return (
    <div className="cyd-tab-panel" data-cyd-part="blocked-tab">
      <ul className="cyd-list">
        {newestFirst.map((request, i) => (
          <li
            // biome-ignore lint/suspicious/noArrayIndexKey: entries can repeat (same url/method); timestamp+index is the stable identity here
            key={`${request.timestamp}-${i}`}
            className="cyd-list-row"
            data-cyd-part="blocked-request-row"
          >
            <span className="cyd-list-time">{formatTimestamp(request.timestamp)}</span>
            <span className="cyd-tag cyd-tag-danger">{request.method}</span>
            <span className="cyd-list-url" title={request.url}>
              {request.url}
            </span>
            <span className="cyd-list-detail">
              <span className="cyd-tag">{request.rule.category}</span>
              <span className="cyd-list-rule">{request.rule.id}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

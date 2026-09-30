"use client";

import type { ConsentManager } from "@cookieyes/react";
import { useState } from "react";
import { copyJson } from "../../lib/copy-json.js";
import type { DevRuntimeData } from "../../types.js";
import { Icon } from "../Icon.js";

export type ConsentTabProps = {
  data: DevRuntimeData["consent"];
  manager: ConsentManager | undefined;
  /** Category ids that are always on (the resolved taxonomy's `required`). */
  requiredIds?: ReadonlySet<string> | undefined;
};

/**
 * Working vs committed consent, side by side. The Working column is editable
 * (`updateCategory`, unsaved until Save), so a category can be tested without
 * going through the banner; a changed row is highlighted and the footer says
 * how many changes are unsaved.
 */
export function ConsentTab({ data, manager, requiredIds }: ConsentTabProps) {
  const categoryIds = Object.keys(data.working).sort((a, b) => a.localeCompare(b));
  const unsaved = categoryIds.filter((id) => data.working[id] !== data.committed[id]).length;
  const [copied, setCopied] = useState(false);
  const plural = unsaved === 1 ? "" : "s";
  const unsavedLabel =
    unsaved > 0 ? `${unsaved} unsaved change${plural}` : "Working matches committed";

  return (
    <div className="cyd-tab-panel cyd-tab-panel-footer" data-cyd-part="consent-tab">
      <div className="cyd-toolbar">
        <dl className="cyd-meta">
          <div className="cyd-meta-item">
            <dt>Regulation</dt>
            <dd>{data.regulation}</dd>
          </div>
          <div className="cyd-meta-item">
            <dt>Visitor acted</dt>
            <dd>{data.hasActed ? "yes" : "no"}</dd>
          </div>
        </dl>
        <button
          type="button"
          className="cyd-btn"
          data-cyd-part="copy-state-json"
          onClick={() =>
            void copyJson({ consent: data }).then((ok) => {
              setCopied(ok);
              if (ok) setTimeout(() => setCopied(false), 1500);
            })
          }
        >
          <Icon name="copy" />
          {copied ? "Copied" : "Copy state as JSON"}
        </button>
      </div>

      <div className="cyd-table-wrap">
        <table className="cyd-table">
          <thead>
            <tr>
              <th>Category</th>
              <th>Working</th>
              <th>Committed</th>
            </tr>
          </thead>
          <tbody>
            {categoryIds.map((id) => {
              const working = data.working[id] === true;
              const committed = data.committed[id] === true;
              const locked = requiredIds?.has(id) === true;
              return (
                <tr
                  key={id}
                  className={working !== committed ? "cyd-row-diff" : ""}
                  data-cyd-part={`consent-row-${id}`}
                >
                  <td className="cyd-code">
                    {id}
                    {locked ? (
                      <span className="cyd-lock" title="Always active">
                        <Icon name="lock" />
                      </span>
                    ) : null}
                  </td>
                  <td>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={working}
                      aria-label={`${id}: working consent`}
                      className="cyd-switch"
                      data-cyd-part={`consent-row-${id}-toggle`}
                      disabled={locked || !manager}
                      onClick={() => manager?.updateCategory(id, !working)}
                    >
                      <span className="cyd-switch-knob" aria-hidden="true" />
                      <span className="cyd-sr" data-cyd-part={`consent-row-${id}-working`}>
                        {String(working)}
                      </span>
                    </button>
                  </td>
                  <td>
                    <span
                      className={`cyd-bool cyd-bool-${committed}`}
                      data-cyd-part={`consent-row-${id}-committed`}
                    >
                      {String(committed)}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className={`cyd-footer-bar${unsaved > 0 ? " cyd-footer-bar-dirty" : ""}`}>
        <span className="cyd-footer-status" data-cyd-part="consent-unsaved">
          {unsavedLabel}
        </span>
        <div className="cyd-toolbar-actions">
          <button
            type="button"
            className="cyd-btn"
            data-cyd-part="consent-reject-all"
            onClick={() => manager?.rejectAll("api")}
          >
            Reject all
          </button>
          <button
            type="button"
            className="cyd-btn"
            data-cyd-part="consent-accept-all"
            onClick={() => manager?.acceptAll("api")}
          >
            Accept all
          </button>
          <button
            type="button"
            className="cyd-btn cyd-btn-primary"
            data-cyd-part="consent-save"
            disabled={unsaved === 0}
            onClick={() => manager?.savePreferences("api")}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

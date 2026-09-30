"use client";

import type { RegionDecision } from "@cookieyes/react";
import { type FormEvent, useState } from "react";

export type RegionTabProps = {
  decision: RegionDecision;
  drivingSignal: string | undefined;
  forcedRegion: string | undefined;
  /** An override is set but the SDK would ignore it (see `DevRuntimeData`). */
  forcedRegionIgnored?: boolean | undefined;
  onForceRegion: (region: string) => void;
  onClearOverride: () => void;
};

const COMMON_TEST_REGIONS = ["US-CA", "US", "DE", "GB", "FR", "BR", "JP"];

/**
 * Current region/regulation decision, plus a `forceRegion` picker (AD-4). The
 * warning banner appears whenever an override is active — never when
 * `decision.source` is anything else — so it can never be confused with a
 * real production decision (Story 3.3/3.4).
 */
export function RegionTab({
  decision,
  drivingSignal,
  forcedRegion,
  forcedRegionIgnored = false,
  onForceRegion,
  onClearOverride,
}: RegionTabProps) {
  const [draft, setDraft] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = draft.trim();
    if (value) onForceRegion(value);
  }

  return (
    <div className="cyd-tab-panel" data-cyd-part="region-tab">
      {decision.source === "forced" ? (
        <div className="cyd-banner cyd-banner-warning" data-cyd-part="region-forced-warning">
          Region is forced to {decision.region} — this would differ in production, where it would
          resolve from real geo headers instead.
        </div>
      ) : null}
      {forcedRegionIgnored ? (
        <div className="cyd-banner cyd-banner-info" data-cyd-part="region-forced-ignored">
          Region override {forcedRegion} has no effect: the regulation is set to{" "}
          {decision.regulation}, so the region is ignored here and in production. Remove the manual{" "}
          <code>regulation</code> (or add a <code>region</code> config) to test by region.
        </div>
      ) : null}

      <div className="cyd-table-wrap">
        <table className="cyd-table cyd-table-kv">
          <tbody>
            <tr>
              <th>Region</th>
              <td>{decision.region ?? "—"}</td>
            </tr>
            <tr>
              <th>Regulation</th>
              <td>{decision.regulation}</td>
            </tr>
            <tr>
              <th>Source</th>
              <td data-cyd-part="region-source">{decision.source}</td>
            </tr>
            <tr>
              <th>Confidence</th>
              <td>{decision.confidence}</td>
            </tr>
            {decision.source !== "forced" ? (
              <tr>
                <th>Driving signal</th>
                <td data-cyd-part="region-driving-signal">{drivingSignal ?? "none"}</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <form className="cyd-force" onSubmit={handleSubmit}>
        <label className="cyd-force-label" htmlFor="cyd-force-region">
          Force a region
        </label>
        <div className="cyd-force-row">
          <input
            id="cyd-force-region"
            className="cyd-input"
            data-cyd-part="region-force-input"
            placeholder="e.g. US-CA"
            list="cyd-common-regions"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
          />
          <datalist id="cyd-common-regions">
            {COMMON_TEST_REGIONS.map((region) => (
              <option key={region} value={region} />
            ))}
          </datalist>
          <button
            type="submit"
            className="cyd-btn cyd-btn-primary"
            data-cyd-part="region-force-submit"
          >
            Force region
          </button>
          {forcedRegion !== undefined ? (
            <button
              type="button"
              className="cyd-btn"
              data-cyd-part="region-clear-override"
              onClick={onClearOverride}
            >
              Clear override
            </button>
          ) : null}
        </div>
      </form>
      <p className="cyd-note">
        A forced region updates live here on the client. The server-rendered banner needs a page
        reload to pick it up on its next request.
      </p>
    </div>
  );
}

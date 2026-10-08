"use client";

import type { LanguageInfo, RegionConfig, RegionDecision, Regulation } from "@cookieyes/react";
import { useMemo } from "react";
import type { LanguageSwitchStatus } from "../../hooks/useLanguageOverride.js";
import { languageLabel, TRANSLATION_LOCALES, toLanguageTag } from "../../lib/languages.js";
import {
  COUNTRY_CODES,
  QUICK_REGIONS,
  regionName,
  toRegionCode,
  US_STATES,
} from "../../lib/regions.js";
import { Combobox, type ComboboxOption } from "../Combobox.js";

export type RegionTabProps = {
  decision: RegionDecision;
  drivingSignal: string | undefined;
  forcedRegion: string | undefined;
  /** An override is set but the SDK would ignore it (see `DevRuntimeData`). */
  forcedRegionIgnored?: boolean | undefined;
  /** The override changed here and applies on the next page load. */
  pendingReload?: boolean | undefined;
  /** The decision the page runs on until then. */
  applied?: RegionDecision | undefined;
  /** The runtime's region config, so each option can show the regulation it maps to. */
  regionConfig?: RegionConfig | undefined;
  onForceRegion: (region: string) => void;
  onClearOverride: () => void;
  language?: LanguageInfo | undefined;
  languageOverride?: string | undefined;
  languageStatus?: LanguageSwitchStatus | undefined;
  onLanguageChange?: ((tag: string) => void) | undefined;
  onClearLanguage?: (() => void) | undefined;
};

/** What `resolveRegion` would map a region to, mirroring its full-then-country lookup. */
function mappedRegulation(config: RegionConfig, code: string): Regulation | undefined {
  return config.map?.[code] ?? config.map?.[code.split("-")[0] ?? ""];
}

function regionOptions(config: RegionConfig | undefined): ComboboxOption[] {
  const strictest = config?.strictest ?? "GDPR";
  const badge = (code: string) => {
    if (!config) return undefined;
    return mappedRegulation(config, code) ?? `${strictest}*`;
  };
  const option = (code: string, group: string): ComboboxOption => ({
    value: code,
    label: regionName(code),
    group,
    leading: code,
    badge: badge(code),
    keywords: code,
  });
  const mapped = Object.keys(config?.map ?? {})
    .sort()
    .map((code) => option(code, "In your region map"));
  const byName = (a: ComboboxOption, b: ComboboxOption) => a.label.localeCompare(b.label);
  const countries = COUNTRY_CODES.map((code) => option(code, "Countries")).sort(byName);
  const states = Object.keys(US_STATES).map((code) => option(code, "US states"));
  return [...mapped, ...countries, ...states];
}

function languageOptions(info: LanguageInfo | undefined): ComboboxOption[] {
  const loaded = info?.languages ?? ["en"];
  const option = (tag: string, group: string): ComboboxOption => {
    const { label, native } = languageLabel(tag);
    return {
      value: tag,
      label: native ? `${label} · ${native}` : label,
      group,
      badge: tag,
      keywords: tag,
    };
  };
  const extra = TRANSLATION_LOCALES.filter((tag) => !loaded.includes(tag));
  return [
    ...loaded.map((tag) => option(tag, "Loaded by your config")),
    ...extra.map((tag) => option(tag, "In @cookieyes/translations")),
  ];
}

/**
 * Current region/regulation decision, a searchable `forceRegion` picker
 * (AD-4) and a live language switcher. The forced-region warning appears
 * whenever an override is active — never when `decision.source` is anything
 * else — so it can never be confused with a real production decision
 * (Story 3.3/3.4).
 */
export function RegionTab({
  decision,
  drivingSignal,
  forcedRegion,
  forcedRegionIgnored = false,
  pendingReload = false,
  applied,
  regionConfig,
  onForceRegion,
  onClearOverride,
  language,
  languageOverride,
  languageStatus = { kind: "idle" },
  onLanguageChange,
  onClearLanguage,
}: RegionTabProps) {
  const regions = useMemo(() => regionOptions(regionConfig), [regionConfig]);
  const languages = useMemo(() => languageOptions(language), [language]);

  return (
    <div className="cyd-tab-panel" data-cyd-part="region-tab">
      {decision.source === "forced" ? (
        <div className="cyd-banner cyd-banner-warning" data-cyd-part="region-forced-warning">
          Region is forced to {decision.region} — this would differ in production, where it would
          resolve from real geo headers instead.
        </div>
      ) : null}
      {pendingReload ? (
        <div className="cyd-banner cyd-banner-info cyd-banner-row" data-cyd-part="region-pending">
          <span>
            Not applied yet: the page still runs on{" "}
            <strong>
              {applied?.region ?? "no region"} · {applied?.regulation ?? "—"}
            </strong>
            . The table shows what applies after a reload.
          </span>
          <button
            type="button"
            className="cyd-btn cyd-btn-primary"
            data-cyd-part="region-reload"
            onClick={() => window.location.reload()}
          >
            Reload now
          </button>
        </div>
      ) : null}
      {forcedRegionIgnored ? (
        <div className="cyd-banner cyd-banner-info" data-cyd-part="region-forced-ignored">
          Region override {forcedRegion} has no effect: the regulation is set to{" "}
          {decision.regulation}, so the region is ignored here and in production. Remove the manual{" "}
          <code>regulation</code> (or add a <code>region</code> config) to test by region.
        </div>
      ) : null}

      <section className="cyd-section">
        <h3 className="cyd-section-title">Region</h3>
        <div className="cyd-field-row">
          <Combobox
            part="region-force"
            label="Force a region"
            value={forcedRegion}
            options={regions}
            onChange={onForceRegion}
            placeholder="Not forced — using the detected region"
            searchPlaceholder="Search countries, states or type a code (US-TX)"
            toCustomValue={toRegionCode}
          />
          {forcedRegion !== undefined ? (
            <button
              type="button"
              className="cyd-btn"
              data-cyd-part="region-clear-override"
              onClick={onClearOverride}
            >
              Clear
            </button>
          ) : null}
        </div>
        <div className="cyd-chips cyd-quick">
          {QUICK_REGIONS.map(({ code, label }) => (
            <button
              key={code}
              type="button"
              className={
                forcedRegion === code ? "cyd-chip-btn cyd-chip-btn-active" : "cyd-chip-btn"
              }
              data-cyd-part="region-quick"
              data-value={code}
              aria-pressed={forcedRegion === code}
              title={`Force ${code}`}
              onClick={() => onForceRegion(code)}
            >
              {label}
              {regionConfig ? (
                <span className="cyd-chip-count">
                  {mappedRegulation(regionConfig, code) ?? `${regionConfig.strictest ?? "GDPR"}*`}
                </span>
              ) : null}
            </button>
          ))}
        </div>

        <div className="cyd-table-wrap">
          <table className="cyd-table cyd-table-kv">
            <tbody>
              <tr>
                <th>Region</th>
                <td>
                  {decision.region ? (
                    <>
                      {regionName(decision.region)} <code>{decision.region}</code>
                    </>
                  ) : (
                    "—"
                  )}
                </td>
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
        <p className="cyd-note">
          {regionConfig
            ? "* Not in your region map, so it falls back to the strictest regulation. "
            : ""}
          A forced region applies on the next page load, to the server-rendered banner and the
          client alike; the table previews it straight away.
        </p>
      </section>

      {onLanguageChange ? (
        <section className="cyd-section">
          <h3 className="cyd-section-title">Language</h3>
          <div className="cyd-field-row">
            <Combobox
              part="language"
              label="Banner language"
              value={language?.language}
              options={languages}
              onChange={onLanguageChange}
              placeholder="English"
              searchPlaceholder="Search languages or type a tag (pt-BR)"
              toCustomValue={toLanguageTag}
            />
            {languageOverride !== undefined ? (
              <button
                type="button"
                className="cyd-btn"
                data-cyd-part="language-clear"
                onClick={onClearLanguage}
              >
                Reset
              </button>
            ) : null}
          </div>
          {languageStatus.kind === "failed" ? (
            <div
              className="cyd-banner cyd-banner-info"
              data-cyd-part="language-failed"
              role="status"
            >
              No translations for <code>{languageStatus.tag}</code>, so the banner stays in{" "}
              {languageLabel(language?.language ?? "en").label}. Add it to{" "}
              <code>i18n.messages</code> or provide <code>i18n.loadLanguage</code>.
            </div>
          ) : null}
          {languageStatus.kind === "loading" ? (
            <p className="cyd-note" role="status">
              Loading <code>{languageStatus.tag}</code>…
            </p>
          ) : null}
          <div className="cyd-table-wrap">
            <table className="cyd-table cyd-table-kv">
              <tbody>
                <tr>
                  <th>Active</th>
                  <td data-cyd-part="language-active">
                    {languageLabel(language?.language ?? "en").label}{" "}
                    <code>{language?.language ?? "en"}</code>
                    {languageOverride !== undefined ? " (overridden)" : ""}
                  </td>
                </tr>
                <tr>
                  <th>Direction</th>
                  <td>{language?.direction ?? "ltr"}</td>
                </tr>
                <tr>
                  <th>Loaded</th>
                  <td>{(language?.languages ?? ["en"]).join(", ")}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="cyd-note">
            Switches live with the runtime's own <code>setLanguage</code>, and is re-applied after a
            reload until you reset it.
          </p>
        </section>
      ) : null}
    </div>
  );
}

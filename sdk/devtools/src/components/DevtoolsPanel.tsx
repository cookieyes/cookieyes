"use client";

import type { ConsentManager, CookieYesRuntime, LanguageInfo } from "@cookieyes/react";
import type { LanguageSwitchStatus } from "../hooks/useLanguageOverride.js";
import type { Finding } from "../scanner/classify.js";
import type { DevRuntimeData, DevtoolsPosition, DevtoolsTheme, TabId } from "../types.js";
import { CookieYesMark } from "./CookieYesMark.js";
import { DevtoolsTablist } from "./DevtoolsTablist.js";
import { Icon } from "./Icon.js";
import { ThemeSwitch } from "./ThemeSwitch.js";
import { ActionsTab } from "./tabs/ActionsTab.js";
import { BlockedRequestsTab } from "./tabs/BlockedRequestsTab.js";
import { ConsentTab } from "./tabs/ConsentTab.js";
import { EventsTab } from "./tabs/EventsTab.js";
import { GoogleConsentModeTab } from "./tabs/GoogleConsentModeTab.js";
import { IntegrationsTab } from "./tabs/IntegrationsTab.js";
import { RegionTab } from "./tabs/RegionTab.js";
import { ScannerTab } from "./tabs/ScannerTab.js";

export type DevtoolsPanelProps = {
  panelId: string;
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  onClose: () => void;
  data: DevRuntimeData;
  manager: ConsentManager | undefined;
  onForceRegion: (region: string) => void;
  onClearRegionOverride: () => void;
  /** Which corner the trigger sits in; the panel opens beside it. */
  position?: DevtoolsPosition | undefined;
  /** The header's System/Light/Dark switch; hidden when `onThemeChange` is not given. */
  themeChoice?: DevtoolsTheme | undefined;
  onThemeChange?: ((theme: DevtoolsTheme) => void) | undefined;
  /** The runtime, for the Actions tab (opt-out dialog) and the required categories. */
  runtime?: CookieYesRuntime | undefined;
  /** Clears the Events tab (and the blocked-request list). */
  onClearEvents?: (() => void) | undefined;
  /** The language picker; hidden when `onLanguageChange` is not given. */
  language?: LanguageInfo | undefined;
  languageOverride?: string | undefined;
  languageStatus?: LanguageSwitchStatus | undefined;
  onLanguageChange?: ((tag: string) => void) | undefined;
  onClearLanguage?: (() => void) | undefined;
  /** The Scanner tab; hidden from the tab body when `scanner` is not given. */
  scanner?:
    | {
        findings: Finding[];
        dismissed: string[];
        dismiss: (key: string) => void;
        restore: (key: string) => void;
        rescan: () => void;
      }
    | undefined;
};

/**
 * Docked container: header, tablist, the active tab's panel and a status
 * footer. Not a modal, so the host page stays interactive underneath it
 * (matching the reference implementations — see AD-7). Fully controlled: it
 * and its children hold no data of their own, only `data` passed down from
 * `useDevRuntimeData()`.
 */
export function DevtoolsPanel({
  panelId,
  activeTab,
  onTabChange,
  onClose,
  data,
  manager,
  onForceRegion,
  onClearRegionOverride,
  position = "bottom-right",
  themeChoice = "system",
  onThemeChange,
  runtime,
  onClearEvents,
  language,
  languageOverride,
  languageStatus,
  onLanguageChange,
  onClearLanguage,
  scanner,
}: DevtoolsPanelProps) {
  const decision = data.region.decision;
  // The footer reports what the page is running on, never a pending preview.
  const applied = data.region.applied ?? decision;
  const forced = applied.source === "forced";
  const counts: Partial<Record<TabId, number>> = {
    blocked: data.blockedRequests.length,
    events: data.events.length,
  };
  const dismissedKeys = new Set(scanner?.dismissed);
  const scanIssues =
    scanner?.findings.filter(
      (f) => (f.preConsent || f.afterWithdrawal) && !dismissedKeys.has(f.key),
    ).length ?? 0;
  if (scanIssues > 0) counts.scanner = scanIssues;
  return (
    // Escape is handled globally by `useKeyboardShortcut` (attached at
    // `document` level in devtools.tsx) — not duplicated here.
    <div id={panelId} className={`cyd-panel cyd-panel-${position}`} data-cyd-part="panel">
      <div className="cyd-panel-header">
        <div className="cyd-panel-brand">
          <CookieYesMark className="cyd-panel-mark" />
          <span className="cyd-panel-title">CookieYes</span>
          <span className="cyd-panel-subtitle">Devtools</span>
        </div>
        <div className="cyd-panel-meta">
          {onThemeChange ? <ThemeSwitch value={themeChoice} onChange={onThemeChange} /> : null}
          <button
            type="button"
            className="cyd-icon-btn"
            data-cyd-part="panel-close"
            aria-label="Close CookieYes devtools"
            onClick={onClose}
          >
            <Icon name="close" />
          </button>
        </div>
      </div>
      {data.queueVersionUnknown ? (
        <p className="cyd-warning" data-cyd-part="queue-version-warning" role="alert">
          The instrumentation queue (<code>__COOKIEYES_DEVTOOLS__</code>) is running a version this
          panel doesn't recognize — some data below may be missing or misread. Update
          `@cookieyes/devtools` to match your SDK version.
        </p>
      ) : null}
      <DevtoolsTablist
        activeTab={activeTab}
        onTabChange={onTabChange}
        panelId={panelId}
        counts={counts}
      />
      <div
        id={`${panelId}-panel`}
        className="cyd-panel-body"
        role="tabpanel"
        aria-labelledby={`cyd-tab-${activeTab}`}
      >
        {activeTab === "consent" ? (
          <ConsentTab
            data={data.consent}
            manager={manager}
            requiredIds={runtime?.categories.requiredIds}
          />
        ) : null}
        {activeTab === "integrations" ? <IntegrationsTab integrations={data.integrations} /> : null}
        {activeTab === "blocked" ? <BlockedRequestsTab requests={data.blockedRequests} /> : null}
        {activeTab === "gcm" ? (
          <GoogleConsentModeTab current={data.gcm.current} history={data.gcm.history} />
        ) : null}
        {activeTab === "events" ? <EventsTab events={data.events} onClear={onClearEvents} /> : null}
        {activeTab === "region" ? (
          <RegionTab
            decision={decision}
            drivingSignal={data.region.drivingSignal}
            forcedRegion={data.region.forcedRegion}
            forcedRegionIgnored={data.region.forcedRegionIgnored === true}
            pendingReload={data.region.pendingReload === true}
            applied={data.region.applied}
            regionConfig={data.region.config?.region}
            onForceRegion={onForceRegion}
            onClearOverride={onClearRegionOverride}
            language={language}
            languageOverride={languageOverride}
            languageStatus={languageStatus}
            onLanguageChange={onLanguageChange}
            onClearLanguage={onClearLanguage}
          />
        ) : null}
        {activeTab === "scanner" && scanner ? (
          <ScannerTab
            findings={scanner.findings}
            dismissed={scanner.dismissed}
            onDismiss={scanner.dismiss}
            onRestore={scanner.restore}
            onRescan={scanner.rescan}
          />
        ) : null}
        {activeTab === "actions" ? (
          <ActionsTab runtime={runtime} data={data} onClose={onClose} />
        ) : null}
      </div>
      <div className="cyd-panel-footer">
        <span className="cyd-live" data-cyd-part="panel-status">
          <span className="cyd-live-dot" aria-hidden="true" />
          Live
        </span>
        <span className="cyd-footer-sep" aria-hidden="true">
          ·
        </span>
        <span>{data.consent.regulation}</span>
        {applied.region ? (
          <>
            <span className="cyd-footer-sep" aria-hidden="true">
              ·
            </span>
            <span className={forced ? "cyd-footer-forced" : undefined}>
              {applied.region}
              {forced ? " (forced)" : ""}
            </span>
          </>
        ) : null}
        {language ? (
          <>
            <span className="cyd-footer-sep" aria-hidden="true">
              ·
            </span>
            <span
              className={languageOverride !== undefined ? "cyd-footer-forced" : undefined}
              data-cyd-part="footer-language"
            >
              {language.language}
            </span>
          </>
        ) : null}
        <span className="cyd-panel-footer-end" aria-hidden="true">
          <kbd className="cyd-kbd">⌘/Ctrl ⇧ Y</kbd>
          <kbd className="cyd-kbd">esc</kbd>
        </span>
      </div>
    </div>
  );
}

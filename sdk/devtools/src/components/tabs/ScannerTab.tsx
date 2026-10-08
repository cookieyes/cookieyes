"use client";

import { useMemo, useState } from "react";
import { copyText } from "../../lib/copy-json.js";
import { downloadJson, timestampedFilename } from "../../lib/download-json.js";
import type { Finding, FindingStatus } from "../../scanner/classify.js";
import { pageStartedAt } from "../../scanner/collector.js";
import { snippetFor } from "../../scanner/snippets.js";
import { Icon } from "../Icon.js";

export type ScannerTabProps = {
  findings: Finding[];
  dismissed: string[];
  onDismiss: (key: string) => void;
  onRestore: (key: string) => void;
  onRescan: () => void;
};

type Filter = "issues" | "unmanaged" | "stores" | "managed" | "all";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "issues", label: "Issues" },
  { id: "unmanaged", label: "Unmanaged" },
  { id: "stores", label: "Cookies & storage" },
  { id: "managed", label: "Managed" },
  { id: "all", label: "All" },
];

const KIND_LABEL: Record<Finding["kind"], string> = {
  script: "script",
  iframe: "iframe",
  request: "requests",
  cookie: "cookie",
  storage: "storage",
};

const STATUS_RANK: Record<FindingStatus, number> = {
  unmanaged: 1,
  unclassified: 2,
  managed: 3,
  necessary: 4,
};

function isIssue(f: Finding): boolean {
  return f.preConsent || f.afterWithdrawal;
}

function isStore(f: Finding): boolean {
  return f.kind === "cookie" || f.kind === "storage";
}

function matchesFilter(f: Finding, filter: Filter): boolean {
  switch (filter) {
    case "issues":
      return isIssue(f);
    case "unmanaged":
      return !isStore(f) && (f.status === "unmanaged" || f.status === "unclassified");
    case "stores":
      return isStore(f) && f.present;
    case "managed":
      return f.status === "managed";
    default:
      return true;
  }
}

/** Seen this soon after navigation start means it was there before the page's own code ran. */
const AT_LOAD_MS = 1500;

function sinceLoad(at: number): string {
  const seconds = (at - pageStartedAt()) / 1000;
  return seconds < 0.05 ? "at load" : `+${seconds.toFixed(1)}s`;
}

/** One sentence on why the finding has its status, written for the developer reading it. */
function explain(f: Finding): string {
  const who = f.vendor?.name ?? (isStore(f) ? "an unknown script" : f.label);
  const cat = f.category ? `“${f.category}”` : "its category";
  if (f.afterWithdrawal) {
    return `Still set after ${cat} was withdrawn. The integration that set it should remove it on revoke (onRevoke: "remove").`;
  }
  if (f.preConsent && isStore(f) && f.firstSeen - pageStartedAt() < AT_LOAD_MS) {
    return `Already set when the page loaded, before ${cat} was granted: left over from an earlier visit, or set before the SDK could gate it. Either way it's present without consent; clear it and reload to see whether it comes back.`;
  }
  if (f.preConsent) {
    const lead =
      f.status === "managed"
        ? `Managed by ${f.managedBy}, but`
        : `${who} usually needs ${cat} consent, and it`;
    const when = sinceLoad(f.firstSeen);
    const at = when === "at load" ? "at page load" : `${when.slice(1)} after load`;
    if (f.loadedAfterWithdrawal) {
      return `${lead} appeared ${at}, after ${cat} was withdrawn. It loaded without consent: check what loads it.`;
    }
    return `${lead} appeared ${at}, before ${cat} was granted. A possible pre-consent load: check what loads it.`;
  }
  if (f.consentModeByDesign) {
    return `Managed by ${f.managedBy}. It loads before consent on purpose: Google Consent Mode keeps it cookieless until ${cat} is granted.`;
  }
  switch (f.status) {
    case "managed":
      return `Managed by ${f.managedBy}; it loads only once ${cat} is granted.`;
    case "necessary":
      return `${who} is strictly necessary, so it needs no consent.`;
    case "unmanaged":
      return isStore(f)
        ? `Set by ${who}. Gate ${who}'s script and this goes away.`
        : `${who} usually needs ${cat} consent, and the SDK doesn't gate it.`;
    default:
      return "Not in the vendor table, so no category can be suggested. Check what it does before deciding.";
  }
}

function StatusIcon({ finding }: { finding: Finding }) {
  if (isIssue(finding)) {
    return (
      <span className="cyd-scan-icon cyd-scan-icon-danger" title="Issue">
        <Icon name="warning" />
      </span>
    );
  }
  if (finding.status === "managed" || finding.status === "necessary") {
    return (
      <span className="cyd-scan-icon cyd-scan-icon-ok" title={finding.status}>
        <Icon name="check" />
      </span>
    );
  }
  return (
    <span className="cyd-scan-icon cyd-scan-icon-warn" title={finding.status}>
      <Icon name="warning" />
    </span>
  );
}

/**
 * Everything third-party on the page — scripts, iframes, requests, cookies and
 * localStorage keys — sorted into what the SDK manages and what it doesn't,
 * with anything that showed up before its category was granted at the top.
 * Each unmanaged row carries the snippet that would bring it under control.
 */
export function ScannerTab({
  findings,
  dismissed,
  onDismiss,
  onRestore,
  onRescan,
}: ScannerTabProps) {
  const [filter, setFilter] = useState<Filter>("issues");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string | undefined>(undefined);
  const [showDismissed, setShowDismissed] = useState(false);
  const [copied, setCopied] = useState<string | undefined>(undefined);

  const hidden = useMemo(() => new Set(dismissed), [dismissed]);
  const active = useMemo(() => findings.filter((f) => !hidden.has(f.key)), [findings, hidden]);

  const counts = useMemo(() => {
    const c = {} as Record<Filter, number>;
    for (const { id } of FILTERS) c[id] = active.filter((f) => matchesFilter(f, id)).length;
    return c;
  }, [active]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (showDismissed ? findings : active)
      .filter((f) => matchesFilter(f, filter))
      .filter(
        (f) =>
          !q ||
          `${f.label} ${f.url ?? ""} ${f.vendor?.name ?? ""} ${f.category ?? ""}`
            .toLowerCase()
            .includes(q),
      )
      .sort(
        (a, b) =>
          Number(isIssue(b)) - Number(isIssue(a)) ||
          STATUS_RANK[a.status] - STATUS_RANK[b.status] ||
          a.firstSeen - b.firstSeen,
      );
  }, [findings, active, filter, query, showDismissed]);

  const tiles: { id: Filter; label: string; tone: string }[] = [
    { id: "issues", label: "Without consent", tone: counts.issues ? "danger" : "ok" },
    { id: "unmanaged", label: "Unmanaged", tone: counts.unmanaged ? "warn" : "ok" },
    { id: "stores", label: "Cookies & storage", tone: "neutral" },
    { id: "managed", label: "Managed by the SDK", tone: "neutral" },
  ];

  async function copy(key: string, code: string) {
    if (await copyText(code)) {
      setCopied(key);
      setTimeout(() => setCopied((c) => (c === key ? undefined : c)), 1500);
    }
  }

  return (
    <div className="cyd-tab-panel" data-cyd-part="scanner-tab">
      <div className="cyd-scan-tiles">
        {tiles.map((tile) => (
          <button
            key={tile.id}
            type="button"
            className={`cyd-scan-tile cyd-scan-tile-${tile.tone}${filter === tile.id ? " cyd-scan-tile-active" : ""}`}
            data-cyd-part={`scanner-tile-${tile.id}`}
            aria-pressed={filter === tile.id}
            onClick={() => setFilter(tile.id)}
          >
            <span className="cyd-scan-tile-count">{counts[tile.id]}</span>
            <span className="cyd-scan-tile-label">{tile.label}</span>
          </button>
        ))}
      </div>

      <div className="cyd-toolbar">
        <fieldset className="cyd-chips">
          <legend className="cyd-sr">Filter findings</legend>
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              className={`cyd-chip-btn${filter === f.id ? " cyd-chip-btn-active" : ""}`}
              aria-pressed={filter === f.id}
              data-cyd-part={`scanner-filter-${f.id}`}
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
            data-cyd-part="scanner-rescan"
            onClick={onRescan}
          >
            <Icon name="reset" />
            Rescan
          </button>
          <button
            type="button"
            className="cyd-btn cyd-btn-sm"
            data-cyd-part="scanner-export"
            disabled={findings.length === 0}
            onClick={() =>
              downloadJson(
                timestampedFilename("cookieyes-scan"),
                findings.map(({ vendor, ...f }) => ({
                  ...f,
                  vendor: vendor?.name,
                  dismissed: hidden.has(f.key),
                })),
              )
            }
          >
            <Icon name="download" />
            Export
          </button>
        </div>
      </div>

      <label className="cyd-search">
        <Icon name="search" />
        <input
          type="search"
          className="cyd-search-input"
          placeholder="Search hosts, vendors, cookies"
          aria-label="Search findings"
          data-cyd-part="scanner-search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </label>

      {visible.length === 0 ? (
        <p className="cyd-empty" data-cyd-part="scanner-empty">
          {filter === "issues" && !query
            ? "Nothing loaded before consent. The scanner keeps watching as the page changes."
            : "Nothing matches."}
        </p>
      ) : (
        <ul className="cyd-list cyd-list-select">
          {visible.map((f) => {
            const open = selected === f.key;
            const snippet = open ? snippetFor(f) : undefined;
            const isDismissed = hidden.has(f.key);
            return (
              <li key={f.key} className="cyd-list-item">
                <button
                  type="button"
                  className={`cyd-list-row cyd-scan-row${open ? " cyd-list-row-selected" : ""}${isDismissed || (isStore(f) && !f.present) ? " cyd-list-row-previous" : ""}`}
                  data-cyd-part="scanner-row"
                  data-cyd-key={f.key}
                  data-cyd-status={f.status}
                  aria-expanded={open}
                  onClick={() => setSelected(open ? undefined : f.key)}
                >
                  <StatusIcon finding={f} />
                  <span className="cyd-scan-main">
                    <span className="cyd-scan-name">{f.vendor?.name ?? f.label}</span>
                    <span className="cyd-scan-sub">{f.vendor ? f.label : KIND_LABEL[f.kind]}</span>
                  </span>
                  {f.preConsent || f.afterWithdrawal ? (
                    <span className="cyd-tag cyd-tag-danger">
                      {f.preConsent && !f.loadedAfterWithdrawal
                        ? "before consent"
                        : "after withdrawal"}
                    </span>
                  ) : null}
                  <span className="cyd-tag">{KIND_LABEL[f.kind]}</span>
                  {f.category ? <span className="cyd-tag cyd-tag-accent">{f.category}</span> : null}
                  <span className="cyd-list-time">{sinceLoad(f.firstSeen)}</span>
                </button>
                {open ? (
                  <div className="cyd-scan-detail" data-cyd-part="scanner-detail">
                    <p className="cyd-scan-why">{explain(f)}</p>
                    <dl className="cyd-scan-facts">
                      {f.url ? (
                        <>
                          <dt>URL</dt>
                          <dd className="cyd-scan-url">{f.url}</dd>
                        </>
                      ) : null}
                      <dt>First seen</dt>
                      <dd>
                        {new Date(f.firstSeen).toLocaleTimeString()} ({sinceLoad(f.firstSeen)})
                      </dd>
                      {f.kind === "request" ? (
                        <>
                          <dt>Requests</dt>
                          <dd>{f.count}</dd>
                        </>
                      ) : null}
                      {isStore(f) ? (
                        <>
                          <dt>Present</dt>
                          <dd>{f.present ? "yes" : "no, cleared since"}</dd>
                        </>
                      ) : null}
                      <dt>Status</dt>
                      <dd>
                        {f.status}
                        {f.managedBy ? ` (${f.managedBy})` : ""}
                      </dd>
                    </dl>
                    {snippet ? (
                      <div className="cyd-scan-snippet">
                        <div className="cyd-scan-snippet-head">
                          <span>{snippet.title}</span>
                          <button
                            type="button"
                            className="cyd-btn cyd-btn-sm"
                            data-cyd-part="scanner-copy"
                            onClick={() => void copy(f.key, snippet.code)}
                          >
                            <Icon name={copied === f.key ? "check" : "copy"} />
                            {copied === f.key ? "Copied" : "Copy"}
                          </button>
                        </div>
                        <pre className="cyd-pre">{snippet.code}</pre>
                      </div>
                    ) : null}
                    <div className="cyd-scan-actions">
                      <button
                        type="button"
                        className="cyd-btn cyd-btn-sm"
                        data-cyd-part={isDismissed ? "scanner-restore" : "scanner-dismiss"}
                        onClick={() => (isDismissed ? onRestore(f.key) : onDismiss(f.key))}
                      >
                        {isDismissed ? "Restore" : "Dismiss"}
                      </button>
                    </div>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}

      {dismissed.length > 0 ? (
        <button
          type="button"
          className="cyd-link-btn"
          data-cyd-part="scanner-show-dismissed"
          onClick={() => setShowDismissed((v) => !v)}
        >
          {showDismissed ? "Hide" : "Show"} {dismissed.length} dismissed
        </button>
      ) : null}
      <p className="cyd-note">
        Watches the page live: scripts, iframes and requests from other sites, plus cookies and
        localStorage. Categories come from a built-in vendor table, so treat them as suggestions.
      </p>
    </div>
  );
}

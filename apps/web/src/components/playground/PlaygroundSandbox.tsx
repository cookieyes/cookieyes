"use client";

import { useEffect, useRef, useState } from "react";
import { CodePanel } from "./CodePanel";
import { ConsolePanel } from "./ConsolePanel";
import { ControlsPanel } from "./ControlsPanel";
import { PreviewFrame } from "./PreviewFrame";
import { DEFAULT_CONFIG, type LogEntry, type PlaygroundConfig } from "./playground-config";

/**
 * Long enough that typing a description does not remount the banner on every keystroke,
 * short enough that a click still feels answered.
 */
const PREVIEW_DELAY_MS = 200;

/** The design's ceiling. Past it the oldest line drops off. */
const MAX_LOG_ROWS = 200;

/** Config first and selected, as the design opens: the code is the thing to look at. */
const TABS = [
  { id: "code", label: "Config" },
  { id: "controls", label: "Controls" },
] as const;

type Tab = (typeof TABS)[number]["id"];

export function PlaygroundSandbox({ version }: { version: string }) {
  const [config, setConfig] = useState<PlaygroundConfig>(DEFAULT_CONFIG);
  const [previewConfig, setPreviewConfig] = useState<PlaygroundConfig>(DEFAULT_CONFIG);
  const [replayCount, setReplayCount] = useState(0);
  const [tab, setTab] = useState<Tab>("code");
  const [log, setLog] = useState<LogEntry[]>([]);
  const [logCleared, setLogCleared] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const tabRefs = useRef<Partial<Record<Tab, HTMLButtonElement | null>>>({});

  // The controls stay instant because they read `config`; only the frame waits. Applying a
  // config remounts the SDK, which is far too heavy to do on every keystroke.
  useEffect(() => {
    const timer = setTimeout(() => setPreviewConfig(config), PREVIEW_DELAY_MS);
    return () => clearTimeout(timer);
  }, [config]);

  function update(patch: Partial<PlaygroundConfig>) {
    setConfig((current) => ({ ...current, ...patch }));
  }

  function reset() {
    // A fresh object even though the values are the defaults: if the config is already at
    // its defaults, passing the same reference changes nothing, and a code panel holding
    // unparseable text would keep it — a Reset button that visibly does nothing.
    setConfig({ ...DEFAULT_CONFIG, text: { ...DEFAULT_CONFIG.text } });
    setReplayCount((count) => count + 1);
    setAnnouncement("Configurator reset to defaults.");
  }

  function onTabKeys(event: React.KeyboardEvent) {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const next: Tab = tab === "code" ? "controls" : "code";
    setTab(next);
    // Selection alone would leave focus on a button that is no longer a tab stop.
    tabRefs.current[next]?.focus();
  }

  return (
    <div className="cy-pg-sandbox">
      <header className="cy-pg-header">
        <div className="cy-pg-header-title">
          <h2>Banner sandbox</h2>
          <span className="cy-pg-version">@cookieyes/react {version}</span>
        </div>
        <div className="cy-pg-header-actions">
          <button
            type="button"
            onClick={() => {
              setReplayCount((count) => count + 1);
              setAnnouncement("Replayed from first visit.");
            }}
          >
            Replay from first visit
          </button>
          <button type="button" onClick={reset}>
            Reset to defaults
          </button>
        </div>
      </header>

      {/* Both header actions change several panels at once, which is invisible to anyone
          not watching them. */}
      <p className="cy-pg-visually-hidden" aria-live="polite">
        {announcement}
      </p>

      <div className="cy-pg-body">
        <div className="cy-pg-left">
          <div className="cy-pg-tabs">
            <div className="cy-pg-tabs-track" role="tablist" aria-label="Configure the banner">
              {TABS.map(({ id, label }) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={tab === id}
                  aria-controls={`cy-pg-panel-${id}`}
                  tabIndex={tab === id ? 0 : -1}
                  ref={(node) => {
                    tabRefs.current[id] = node;
                  }}
                  className="cy-pg-tab"
                  onClick={() => setTab(id)}
                  onKeyDown={onTabKeys}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div
            id="cy-pg-panel-controls"
            className="cy-pg-panel"
            role="tabpanel"
            hidden={tab !== "controls"}
          >
            <ControlsPanel config={config} onChange={update} />
          </div>
          <div
            id="cy-pg-panel-code"
            className="cy-pg-panel"
            role="tabpanel"
            hidden={tab !== "code"}
          >
            <CodePanel config={config} onConfigChange={setConfig} />
          </div>
        </div>

        <div className="cy-pg-right">
          <PreviewFrame
            config={previewConfig}
            replayCount={replayCount}
            // Numbered from the list itself. A counter held in a ref looks equivalent but
            // is not: React batches these events and runs every updater afterwards, by
            // which point the ref has already reached its final value and each entry gets
            // the same number.
            onLog={(event) =>
              setLog((current) => {
                const next = [
                  ...current,
                  { ...event, seq: (current[current.length - 1]?.seq ?? 0) + 1 },
                ];
                // Oldest out first past the cap: a session left open should not grow a
                // list nobody is going to scroll back through.
                return next.length > MAX_LOG_ROWS ? next.slice(next.length - MAX_LOG_ROWS) : next;
              })
            }
          />
          <ConsolePanel
            entries={log}
            cleared={logCleared}
            onClear={() => {
              setLog([]);
              setLogCleared(true);
            }}
          />
        </div>
      </div>
    </div>
  );
}

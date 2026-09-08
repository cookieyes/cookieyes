"use client";

import { useEffect, useRef, useState } from "react";
import { CodePanel } from "./CodePanel";
import { ControlsPanel } from "./ControlsPanel";
import { PreviewFrame } from "./PreviewFrame";
import { DEFAULT_CONFIG, type PlaygroundConfig } from "./playground-config";

/**
 * Long enough that typing a description does not remount the banner on every keystroke,
 * short enough that a click still feels answered.
 */
const PREVIEW_DELAY_MS = 200;

const TABS = [
  { id: "controls", label: "Controls" },
  { id: "code", label: "Code" },
] as const;

type Tab = (typeof TABS)[number]["id"];

export function PlaygroundSandbox({ version }: { version: string }) {
  const [config, setConfig] = useState<PlaygroundConfig>(DEFAULT_CONFIG);
  const [previewConfig, setPreviewConfig] = useState<PlaygroundConfig>(DEFAULT_CONFIG);
  const [replayCount, setReplayCount] = useState(0);
  const [tab, setTab] = useState<Tab>("controls");
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
  }

  function onTabKeys(event: React.KeyboardEvent) {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const next: Tab = tab === "controls" ? "code" : "controls";
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
          <button type="button" onClick={() => setReplayCount((count) => count + 1)}>
            Replay from first visit
          </button>
          <button type="button" onClick={reset}>
            Reset to defaults
          </button>
        </div>
      </header>

      <div className="cy-pg-body">
        <div className="cy-pg-left">
          <div className="cy-pg-tabs" role="tablist" aria-label="Configure the banner">
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

          <div id="cy-pg-panel-controls" role="tabpanel" hidden={tab !== "controls"}>
            <ControlsPanel config={config} onChange={update} />
          </div>
          <div id="cy-pg-panel-code" role="tabpanel" hidden={tab !== "code"}>
            <CodePanel config={config} onConfigChange={setConfig} />
          </div>
        </div>

        <PreviewFrame config={previewConfig} replayCount={replayCount} />
      </div>
    </div>
  );
}

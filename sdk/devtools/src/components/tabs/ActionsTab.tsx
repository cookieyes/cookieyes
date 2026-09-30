"use client";

import type { CookieYesRuntime } from "@cookieyes/react";
import { useState } from "react";
import { copyJson } from "../../lib/copy-json.js";
import { buildDebugBundle } from "../../lib/debug-bundle.js";
import { downloadJson, timestampedFilename } from "../../lib/download-json.js";
import type { DevRuntimeData } from "../../types.js";
import { Icon, type IconName } from "../Icon.js";

export type ActionsTabProps = {
  runtime: CookieYesRuntime | undefined;
  data: DevRuntimeData;
  /** Close the panel first, so a dialog opened from here isn't underneath it. */
  onClose: () => void;
};

type Action = {
  id: string;
  icon: IconName;
  label: string;
  hint: string;
  run: () => void | Promise<void>;
};

/**
 * One-click shortcuts for re-testing UI flows without clearing storage by
 * hand: open each piece of consent UI, copy or download the panel's state.
 */
export function ActionsTab({ runtime, data, onClose }: ActionsTabProps) {
  const [done, setDone] = useState<string | undefined>(undefined);
  const flash = (id: string) => {
    setDone(id);
    setTimeout(() => setDone((current) => (current === id ? undefined : current)), 1500);
  };

  const actions: Action[] = [
    {
      id: "open-preferences",
      icon: "sliders",
      label: "Open preferences",
      hint: "The category dialog",
      run: () => {
        onClose();
        runtime?.manager.showPreferences();
      },
    },
    {
      id: "open-optout",
      icon: "optout",
      label: "Open opt-out",
      hint: "The CCPA “Do Not Sell” dialog",
      run: () => {
        onClose();
        runtime?.showOptOut();
      },
    },
    {
      id: "copy-state",
      icon: "copy",
      label: "Copy state",
      hint: "Everything below, as JSON",
      run: async () => {
        if (await copyJson(buildDebugBundle(data))) flash("copy-state");
      },
    },
    {
      id: "export-debug",
      icon: "download",
      label: "Export debug bundle",
      hint: "A .json file for a bug report",
      run: () => {
        if (downloadJson(timestampedFilename("cookieyes-debug"), buildDebugBundle(data))) {
          flash("export-debug");
        }
      },
    },
  ];

  return (
    <div className="cyd-tab-panel" data-cyd-part="actions-tab">
      <div className="cyd-action-grid">
        {actions.map((action) => (
          <button
            key={action.id}
            type="button"
            className="cyd-action"
            data-cyd-part={`action-${action.id}`}
            disabled={!runtime}
            onClick={() => void action.run()}
          >
            <span className="cyd-action-icon">
              <Icon name={action.icon} />
            </span>
            <span className="cyd-action-text">
              <strong>{done === action.id ? "Done" : action.label}</strong>
              <span>{action.hint}</span>
            </span>
          </button>
        ))}
      </div>

      <div className="cyd-danger-zone">
        <div>
          <strong>Reset consent</strong>
          <p>Clears the stored decision; the banner shows again.</p>
        </div>
        <button
          type="button"
          className="cyd-btn cyd-btn-danger"
          data-cyd-part="reset-consent"
          disabled={!runtime}
          onClick={() => runtime?.manager.resetConsent()}
        >
          <Icon name="reset" />
          Reset
        </button>
      </div>
    </div>
  );
}

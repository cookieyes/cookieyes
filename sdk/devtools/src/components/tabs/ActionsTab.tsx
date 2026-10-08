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

type DialogKind = "preferences" | "optout";

// The presets' own markers, plus any dialog outside the panel, so a site that
// builds its own UI on `usePreferencesOpen` / `useOptOutOpen` counts as mounted.
const DIALOG_SELECTORS: Record<DialogKind, string> = {
  preferences: '[data-cy-part="dialog"], [data-cy-part="overlay"]',
  optout: '[data-cy-part="optout"]',
};

function openDialogs(): Set<Element> {
  return new Set(document.querySelectorAll('[role="dialog"], dialog[open]'));
}

// A custom dialog has to be one that appeared after we asked: a site modal
// already open (a newsletter popup) mustn't pass for the missing one.
function dialogRendered(kind: DialogKind, before: Set<Element>): boolean {
  if (document.querySelector(DIALOG_SELECTORS[kind])) return true;
  return [...openDialogs()].some((el) => !before.has(el) && !el.closest(".cyd-root"));
}

const nextFrame = () =>
  new Promise<void>((resolve) => {
    if (typeof requestAnimationFrame === "function") requestAnimationFrame(() => resolve());
    else setTimeout(resolve, 16);
  });

const MISSING: Record<DialogKind, { component: string; what: string }> = {
  preferences: { component: "CookiePreferences", what: "preferences dialog" },
  optout: { component: "CookieOptOut", what: "opt-out dialog" },
};

type Action = {
  id: string;
  icon: IconName;
  label: string;
  hint: string;
  /** Set when the action can't apply right now; shown in place of the hint. */
  unavailable?: string | undefined;
  run: () => void | Promise<void>;
};

/**
 * One-click shortcuts for re-testing UI flows without clearing storage by
 * hand: open each piece of consent UI, copy or download the panel's state.
 */
export function ActionsTab({ runtime, data, onClose }: ActionsTabProps) {
  const [done, setDone] = useState<string | undefined>(undefined);
  const [missing, setMissing] = useState<DialogKind | undefined>(undefined);

  // Opening a dialog nobody renders isn't harmless: the SDK hides the banner
  // while it believes a dialog is open, and only that dialog can close it, so
  // the page was left with no banner and no dialog until a reload. Open it,
  // give React two frames to render, and undo it if nothing appeared.
  async function openDialog(kind: DialogKind) {
    if (!runtime) return;
    setMissing(undefined);
    const before = openDialogs();
    // One at a time, as a visitor would see them: the banner and recall
    // button only ever open one, but this panel could stack both.
    if (kind === "preferences") {
      runtime.hideOptOut();
      runtime.manager.showPreferences();
    } else {
      runtime.manager.hidePreferences();
      runtime.showOptOut();
    }
    await nextFrame();
    await nextFrame();
    if (dialogRendered(kind, before)) {
      onClose();
      return;
    }
    if (kind === "preferences") runtime.manager.hidePreferences();
    else runtime.hideOptOut();
    setMissing(kind);
  }
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
      run: () => openDialog("preferences"),
    },
    {
      id: "open-optout",
      icon: "optout",
      label: "Open opt-out",
      hint: "The CCPA “Do Not Sell” dialog",
      // Visitors only reach it under CCPA (the banner's "Do Not Sell" link and
      // the recall button), so offering it elsewhere would test a state that
      // never happens.
      unavailable:
        data.consent.regulation === "CCPA"
          ? undefined
          : "CCPA only. Force a CCPA region such as US-CA in Locale, then reload.",
      run: () => openDialog("optout"),
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
      {missing ? (
        <div
          className="cyd-banner cyd-banner-info"
          data-cyd-part="action-dialog-missing"
          role="status"
        >
          <p className="cyd-banner-text">
            Nothing renders the {MISSING[missing].what}, so it was closed again (left open, it would
            hide your banner with nothing in its place). Add the component, or your own dialog built
            on <code>{missing === "optout" ? "useOptOutOpen" : "usePreferencesOpen"}</code>:
          </p>
          <pre className="cyd-pre">{`import { ${MISSING[missing].component} } from "@cookieyes/react";\n\n<${MISSING[missing].component} />`}</pre>
        </div>
      ) : null}
      <div className="cyd-action-grid">
        {actions.map((action) => (
          <button
            key={action.id}
            type="button"
            className="cyd-action"
            data-cyd-part={`action-${action.id}`}
            disabled={!runtime || action.unavailable !== undefined}
            title={action.unavailable}
            onClick={() => void action.run()}
          >
            <span className="cyd-action-icon">
              <Icon name={action.icon} />
            </span>
            <span className="cyd-action-text">
              <strong>{done === action.id ? "Done" : action.label}</strong>
              <span data-cyd-part={`action-${action.id}-hint`}>
                {action.unavailable ?? action.hint}
              </span>
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

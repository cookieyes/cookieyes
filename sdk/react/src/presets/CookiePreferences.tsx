"use client";

import type { CSSProperties } from "react";
import { Preferences } from "../primitives/Preferences.js";
import { CY_PART, CY_STATE } from "../styles/parts.js";

/** Styling passthrough — merged onto the visible dialog card, on top of our defaults. */
export type CookiePreferencesProps = {
  className?: string;
  style?: CSSProperties;
};

export function CookiePreferences({ className, style }: CookiePreferencesProps = {}) {
  return (
    <Preferences.Root className="cy-dialog-overlay">
      <div
        className={className ? `cy-dialog ${className}` : "cy-dialog"}
        style={style}
        data-cy-part={CY_PART.dialog.root}
      >
        <div className="cy-dialog-header">
          <Preferences.Title className="cy-dialog-title" />
          <Preferences.Close className="cy-dialog-close" />
        </div>

        <div className="cy-dialog-body">
          <div className="cy-dialog-content-intro">
            <Preferences.Intro className="cy-dialog-desc" />
          </div>
          <Preferences.Categories className="cy-accordion-wrapper">
            {(cat) => (
              <Preferences.Category category={cat} className="cy-accordion">
                {({ label, description, checked, disabled, toggle }) => (
                  <div className="cy-accordion-item">
                    <div className="cy-accordion-header-wrapper">
                      <div className="cy-accordion-header">
                        <span
                          className="cy-accordion-btn"
                          data-cy-part={CY_PART.dialog.categoryLabel}
                        >
                          {label}
                        </span>
                        {disabled ? (
                          <span className="cy-always-active">Always Active</span>
                        ) : (
                          <label
                            className="cy-toggle"
                            data-cy-part={CY_PART.dialog.toggle}
                            data-cy-state={checked ? CY_STATE.on : CY_STATE.off}
                          >
                            <input
                              type="checkbox"
                              role="switch"
                              checked={checked}
                              aria-checked={checked}
                              aria-label={label}
                              onChange={(e) => toggle(e.target.checked)}
                            />
                            <span className="cy-toggle-track" aria-hidden="true">
                              <span className="cy-toggle-thumb" />
                            </span>
                          </label>
                        )}
                      </div>
                      <div className="cy-accordion-header-des">
                        <p data-cy-part={CY_PART.dialog.categoryDescription}>{description}</p>
                      </div>
                    </div>
                  </div>
                )}
              </Preferences.Category>
            )}
          </Preferences.Categories>
        </div>

        <div className="cy-dialog-footer">
          <span className="cy-dialog-footer-shadow" aria-hidden="true" />
          <div className="cy-dialog-footer-actions">
            <Preferences.RejectAll className="cy-btn cy-btn-primary" />
            <Preferences.Save className="cy-btn cy-btn-primary" />
            <Preferences.AcceptAll className="cy-btn cy-btn-primary" />
          </div>
          <Preferences.Branding className="cy-branding" />
        </div>
      </div>
    </Preferences.Root>
  );
}

"use client";

import { OptOut } from "../primitives/OptOut.js";

export function CookieOptOut() {
  return (
    <OptOut.Root className="cy-dialog-overlay" data-cy-theme="system">
      <div className="cy-dialog cy-optout-dialog">
        <div className="cy-dialog-header">
          <OptOut.Title className="cy-dialog-title" />
          <OptOut.Close className="cy-dialog-close" />
        </div>

        <div className="cy-dialog-body">
          <div className="cy-dialog-content-intro">
            <OptOut.Description className="cy-dialog-desc" />
          </div>
          <hr className="cy-separator" />
          <div className="cy-optout-checkbox-wrapper">
            <OptOut.Checkbox id="cy-ccpa-optout" className="cy-optout-checkbox" />
            <OptOut.CheckboxLabel htmlFor="cy-ccpa-optout" className="cy-optout-checkbox-label" />
          </div>
        </div>

        <div className="cy-optout-footer">
          <div className="cy-optout-action-area">
            <OptOut.Buttons className="cy-optout-btn-wrapper">
              <OptOut.Cancel className="cy-btn cy-btn-cancel" />
              <OptOut.Save className="cy-btn cy-btn-confirm" />
            </OptOut.Buttons>
            <OptOut.Success className="cy-optout-success" />
          </div>
          <div className="cy-optout-powered-by">
            <OptOut.Branding className="cy-branding" />
          </div>
        </div>
      </div>
    </OptOut.Root>
  );
}

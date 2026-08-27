"use client";

import type { CSSProperties } from "react";
import { OptOut } from "../primitives/OptOut.js";
import type { CY_PART } from "../styles/parts.js";

/** Every styleable part of the opt-out dialog — keys for {@link CookieOptOutProps.classNames}. */
export type OptOutPart = keyof typeof CY_PART.optOut;

/**
 * Styling passthrough. `className` / `style` target the opt-out card;
 * `classNames` / `styles` target individual parts by name — each merged on top
 * of our defaults. A class you pass always wins over ours (our styles sit in the
 * `cookieyes` cascade layer); an inline `style` wins over any class.
 */
export type CookieOptOutProps = {
  className?: string;
  style?: CSSProperties;
  classNames?: Partial<Record<OptOutPart, string>>;
  styles?: Partial<Record<OptOutPart, CSSProperties>>;
};

export function CookieOptOut({ className, style, classNames, styles }: CookieOptOutProps = {}) {
  /** Merge a part's default class with the caller's `classNames`/`styles` for that part. */
  const part = (key: OptOutPart, base: string) => ({
    className: [base, classNames?.[key]].filter(Boolean).join(" ") || undefined,
    style: styles?.[key],
  });

  return (
    <OptOut.Root className="cy-dialog-overlay">
      <div
        className={["cy-dialog", "cy-optout-dialog", className, classNames?.root]
          .filter(Boolean)
          .join(" ")}
        style={{ ...style, ...styles?.root }}
      >
        <div className="cy-dialog-header">
          <OptOut.Title {...part("title", "cy-dialog-title")} />
          <OptOut.Close {...part("close", "cy-dialog-close")} />
        </div>

        <div className="cy-dialog-body">
          <div className="cy-dialog-content-intro">
            <OptOut.Description {...part("message", "cy-dialog-desc")} />
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
              <OptOut.Save {...part("confirm", "cy-btn cy-btn-confirm")} />
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

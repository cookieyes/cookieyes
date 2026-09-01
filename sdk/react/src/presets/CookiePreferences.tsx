"use client";

import type { CSSProperties } from "react";
import { useTranslations } from "../hooks/useTranslations.js";
import { Preferences } from "../primitives/Preferences.js";
import { CY_PART, CY_STATE } from "../styles/parts.js";

/** Every styleable part of the preferences dialog — keys for {@link CookiePreferencesProps.classNames}. */
export type DialogPart = keyof typeof CY_PART.dialog;

/**
 * Styling passthrough. `className` / `style` target the dialog card;
 * `classNames` / `styles` target individual parts by name (e.g. `toggle`,
 * `save`) — each merged on top of our defaults. A class you pass always wins
 * over ours (ours are single-class rules with no `!important`, so yours wins on source order when your sheet loads later); an inline
 * `style` wins over any class. Style the checked toggle via the `toggle` part
 * and `[data-cy-state="on"]` (see the styling guide).
 */
export type CookiePreferencesProps = {
  className?: string;
  style?: CSSProperties;
  classNames?: Partial<Record<DialogPart, string>>;
  styles?: Partial<Record<DialogPart, CSSProperties>>;
};

export function CookiePreferences({
  className,
  style,
  classNames,
  styles,
}: CookiePreferencesProps = {}) {
  /** Merge a part's default class with the caller's `classNames`/`styles` for that part. */
  const t = useTranslations();
  const part = (key: DialogPart, base: string) => ({
    className: [base, classNames?.[key]].filter(Boolean).join(" ") || undefined,
    style: styles?.[key],
  });

  return (
    <Preferences.Root {...part("overlay", "cy-dialog-overlay")}>
      <div
        className={["cy-dialog", className, classNames?.root].filter(Boolean).join(" ")}
        style={{ ...style, ...styles?.root }}
        data-cy-part={CY_PART.dialog.root}
      >
        <div className="cy-dialog-header">
          <Preferences.Title {...part("title", "cy-dialog-title")} />
          <Preferences.Close {...part("close", "cy-dialog-close")} />
        </div>

        <div className="cy-dialog-body">
          <div className="cy-dialog-content-intro">
            <Preferences.Intro {...part("intro", "cy-dialog-desc")} />
          </div>
          <Preferences.Categories className="cy-accordion-wrapper">
            {(cat) => (
              <Preferences.Category category={cat} {...part("category", "cy-accordion")}>
                {({ label, description, checked, disabled, toggle }) => (
                  <div className="cy-accordion-item">
                    <div className="cy-accordion-header-wrapper">
                      <div className="cy-accordion-header">
                        <span
                          {...part("categoryLabel", "cy-accordion-btn")}
                          data-cy-part={CY_PART.dialog.categoryLabel}
                        >
                          {label}
                        </span>
                        {disabled ? (
                          <span className="cy-always-active">{t.alwaysActive}</span>
                        ) : (
                          <label
                            {...part("toggle", "cy-toggle")}
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
                        <p
                          {...part("categoryDescription", "")}
                          data-cy-part={CY_PART.dialog.categoryDescription}
                        >
                          {description}
                        </p>
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
            <Preferences.RejectAll {...part("rejectAll", "cy-btn cy-btn-primary")} />
            <Preferences.Save {...part("save", "cy-btn cy-btn-primary")} />
            <Preferences.AcceptAll {...part("acceptAll", "cy-btn cy-btn-primary")} />
          </div>
          <Preferences.Branding {...part("branding", "cy-branding")} />
        </div>
      </div>
    </Preferences.Root>
  );
}

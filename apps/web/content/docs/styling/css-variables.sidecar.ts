import type {
  CssVariableSidecarEntry,
  HardcodedColorSidecarEntry,
} from "@/lib/css-variables-reference-types";

/**
 * Hand-maintained, type-checked prose data for every `--cy-*` token.
 *
 * `scripts/generate-css-variables-reference.mjs` extracts the *structural*
 * facts (default light/dark values, every consuming selector, alias
 * relationships) from `sdk/react/src/styles/tokens.ts` and
 * `sdk/react/src/styles/cookieyes.css`, and joins them against this file by
 * `name`. The generator fails the build if a token here has no match in the
 * extraction (stale entry) or if the extraction finds a token with no entry
 * here (undocumented token). See ai-context/designs/css-variables-reference.md §2.3.
 *
 * Twelve entries, in `ThemeVars` declaration order.
 */
export const cssVariableSidecarEntries: CssVariableSidecarEntry[] = [
  {
    name: "--cy-primary",
    configKey: "primaryColor",
    type: "color",
    description:
      "The primary brand colour — primary buttons, links inside the banner description, the checked toggle track, and the source colour for the focus ring and the primary-hover mix.",
    derivedFrom: null,
  },
  {
    name: "--cy-primary-hover",
    configKey: null,
    type: "color",
    description:
      "The primary button's hover colour — a darker mix of --cy-primary, applied on hover in place of the fade every other button gets. No theme key of its own; override it with an author !important rule if you need a different mix.",
    derivedFrom: null,
  },
  {
    name: "--cy-bg",
    configKey: "backgroundColor",
    type: "color",
    description:
      "The banner card and preferences-dialog surface colour — the background you see behind all of their content.",
    derivedFrom: null,
  },
  {
    name: "--cy-text",
    configKey: "textColor",
    type: "color",
    description: "Body and heading text colour across every SDK surface.",
    derivedFrom: null,
  },
  {
    name: "--cy-muted",
    configKey: "mutedTextColor",
    type: "color",
    description:
      "Secondary, less prominent text — the frame placeholder's caption text today; reserved for other secondary text as the SDK grows.",
    derivedFrom: null,
  },
  {
    name: "--cy-border",
    configKey: "borderColor",
    type: "color",
    description:
      "Hairline borders, dividers, and separators — the banner's own border, the dialog header/footer rules, and the accordion separators.",
    derivedFrom: null,
  },
  {
    name: "--cy-widget-bg",
    configKey: "widgetBackgroundColor",
    type: "color",
    description: "The background of the floating recall (re-open) widget button.",
    derivedFrom: null,
  },
  {
    name: "--cy-radius",
    configKey: "borderRadius",
    type: "dimension",
    description:
      "Corner rounding for the banner and preferences dialog — one value shared by both; the iframe placeholder scales it down by 40%.",
    derivedFrom: null,
  },
  {
    name: "--cy-font",
    configKey: "fontFamily",
    type: "fontFamily",
    description: "The font stack used for every piece of SDK text, across every surface.",
    derivedFrom: null,
  },
  {
    name: "--cy-focus",
    configKey: "focusColor",
    type: "color",
    description:
      "The focus-visible outline colour on buttons, the toggle switch, and the CCPA opt-out checkbox. Defaults to a pure alias of --cy-primary — set focusColor to break that link.",
    derivedFrom: null,
  },
  {
    name: "--cy-on-primary",
    configKey: null,
    type: "color",
    description:
      "Automatically computed near-white or near-black text/icon colour, chosen by WCAG relative luminance to be the more readable of the two against --cy-primary. Recomputes only for hex primaryColor values — anything else falls back to white.",
    derivedFrom: "--cy-primary",
  },
  {
    name: "--cy-on-widget-bg",
    configKey: null,
    type: "color",
    description:
      "Automatically computed near-white or near-black icon colour for the recall widget, chosen the same way as --cy-on-primary but against whichever --cy-widget-bg value actually applies in the active colour scheme.",
    derivedFrom: "--cy-widget-bg",
  },
];

/**
 * Hand-maintained sidecar for the 17 hardcoded colour declarations in
 * `cookieyes.css` that have no `--cy-*` token behind them at all. A generator
 * cannot judge which hardcoded colours are "notable" enough to document — that
 * judgment call is what this file is for.
 *
 * Each `{ selector, property, value }` is validated against the live
 * stylesheet by the generator (fail-closed check 6) so an entry can't
 * silently rot after an unrelated CSS edit — `line` is informational only,
 * never used for that validation.
 *
 * Every `overrideSelector` here is verified to WIN outright against the
 * SDK's own rule, not merely tie on source order — see the reasoning in each
 * `overrideNote`. Two techniques are used, both lifting specificity by
 * repeating a simple selector (a legitimate CSS specificity-counting
 * mechanism, not a hack specific to this SDK):
 *   - where the element already carries a `data-cy-part`, the attribute is
 *     repeated: `[data-cy-part="x"][data-cy-part]`, per
 *     `part-and-state-contract.mdx` and the two canonical examples in
 *     design §2.2.
 *   - where it doesn't, the element's own class is repeated instead:
 *     `.cy-foo.cy-foo`, the identical trick applied to a class selector.
 */
export const hardcodedColorSidecarEntries: HardcodedColorSidecarEntry[] = [
  {
    selector: ".cy-dialog-overlay",
    property: "background",
    value: "rgba(0, 0, 0, 0.4)",
    line: 389,
    plainLanguageName: "the dimmed backdrop behind the preferences dialog",
    overrideSelector: '[data-cy-part="overlay"][data-cy-part]',
    overrideNote:
      'Not variable-controlled. The SDK\'s own `.cy-dialog-overlay` rule is (0,1,0); a plain `[data-cy-part="overlay"]` selector is also (0,1,0) and only ties, winning on source order alone. Repeating the attribute lifts your rule to (0,2,0), which wins outright: `[data-cy-part="overlay"][data-cy-part] { background: rgba(0, 0, 0, 0.6); }`.',
    followUpCandidate: true,
  },
  {
    selector: ".cy-toggle-track",
    property: "background",
    value: "#d0d5d2",
    line: 781,
    plainLanguageName: "the toggle switch's track in its off state",
    overrideSelector: '[data-cy-part="toggle"][data-cy-part][data-cy-state="off"] .cy-toggle-track',
    overrideNote:
      'Not variable-controlled. The switch\'s colour is painted by the `.cy-toggle-track` child, so a rule on `[data-cy-part="toggle"]` alone has no visible effect — you must reach the track. This is the same selector documented in the Part & state contract, kept in the same doubled-attribute form used for the "on" state (which must beat a higher-specificity `:checked` sibling rule) so both states use one consistent pattern: `[data-cy-part="toggle"][data-cy-part][data-cy-state="off"] .cy-toggle-track { background: #e2e2e2; }`.',
    followUpCandidate: false,
  },
  {
    selector: ".cy-widget::before",
    property: "background",
    value: "#4e4b66",
    line: 866,
    plainLanguageName: "the recall widget's hover-tooltip background",
    overrideSelector: '[data-cy-part="recall"][data-cy-part]::before',
    overrideNote:
      'Not variable-controlled. `[data-cy-part="recall"]::before` alone is (0,1,1), tying the SDK\'s own `.cy-widget::before` rule; repeating the attribute lifts it to (0,2,1), which wins outright.',
    followUpCandidate: false,
  },
  {
    selector: ".cy-widget::before",
    property: "color",
    value: "#fff",
    line: 867,
    plainLanguageName: "the recall widget's hover-tooltip text colour",
    overrideSelector: '[data-cy-part="recall"][data-cy-part]::before',
    overrideNote:
      'Not variable-controlled. Same tooltip element as the background above — one doubled-attribute rule can set both properties at once.',
    followUpCandidate: false,
  },
  {
    selector: ".cy-widget::after",
    property: "border-right-color",
    value: "#4e4b66",
    line: 883,
    plainLanguageName: "the recall widget's hover-tooltip arrow",
    overrideSelector: '[data-cy-part="recall"][data-cy-part]::after',
    overrideNote:
      'Not variable-controlled. `[data-cy-part="recall"]::after` alone is (0,1,1), tying the SDK\'s own `.cy-widget::after` rule; repeating the attribute lifts it to (0,2,1), which wins outright. Keep this in sync with the tooltip background above — the arrow is a CSS triangle colour-matched to the tooltip.',
    followUpCandidate: false,
  },
  {
    selector: ".cy-btn-cancel",
    property: "color",
    value: "#858585",
    line: 611,
    plainLanguageName: "the CCPA opt-out dialog's Cancel button text",
    overrideSelector: ".cy-btn-cancel.cy-btn-cancel",
    overrideNote:
      "Not variable-controlled, and this button carries no data-cy-part of its own. The SDK's own `.cy-btn-cancel` rule is (0,1,0); a plain `.cy-btn-cancel` override is also (0,1,0) and only ties, winning on source order alone. Repeating the class selector — a legal CSS specificity trick, not a hack — lifts your rule to (0,2,0), which wins outright regardless of import order.",
    followUpCandidate: false,
  },
  {
    selector: ".cy-btn-cancel",
    property: "border",
    value: "1px solid #dedfe0",
    line: 612,
    plainLanguageName: "the CCPA opt-out dialog's Cancel button border",
    overrideSelector: ".cy-btn-cancel.cy-btn-cancel",
    overrideNote:
      "Not variable-controlled. Same button and same doubled-class technique as its text colour above — one rule can set both properties.",
    followUpCandidate: false,
  },
  {
    selector: ".cy-optout-checkbox",
    property: "border",
    value: "1px solid #000",
    line: 671,
    plainLanguageName: "the CCPA opt-out checkbox's border",
    overrideSelector: ".cy-optout-checkbox.cy-optout-checkbox",
    overrideNote:
      "Not variable-controlled, and the checkbox carries no data-cy-part. Repeating the class lifts the override from a tying (0,1,0) to a winning (0,2,0), the same technique as the Cancel button above.",
    followUpCandidate: false,
  },
  {
    selector: ".cy-optout-checkbox",
    property: "background",
    value: "#fff",
    line: 673,
    plainLanguageName: "the CCPA opt-out checkbox's unchecked fill",
    overrideSelector: ".cy-optout-checkbox.cy-optout-checkbox",
    overrideNote: "Not variable-controlled. Same element and technique as its border above.",
    followUpCandidate: false,
  },
  {
    selector: ".cy-optout-checkbox:checked::after",
    property: "border",
    value: "solid #fff",
    line: 691,
    plainLanguageName: "the CCPA opt-out checkbox's checkmark",
    overrideSelector: ".cy-optout-checkbox.cy-optout-checkbox:checked::after",
    overrideNote:
      "Not variable-controlled. The SDK's own rule is `.cy-optout-checkbox:checked::after` at (0,2,1); repeating the base class lifts the override to (0,3,1), which wins outright.",
    followUpCandidate: false,
  },
  {
    selector: ".cy-optout-success",
    property: "background",
    value: "#e5f4ef",
    line: 718,
    plainLanguageName: "the CCPA opt-out success panel's background",
    overrideSelector: ".cy-optout-success.cy-optout-success",
    overrideNote:
      "Not variable-controlled, and this panel carries no data-cy-part. Repeating the class lifts the override from a tying (0,1,0) to a winning (0,2,0).",
    followUpCandidate: false,
  },
  {
    selector: ".cy-optout-success-icon",
    property: "color",
    value: "#00754e",
    line: 738,
    plainLanguageName: "the CCPA opt-out success panel's checkmark icon",
    overrideSelector: ".cy-optout-success-icon.cy-optout-success-icon",
    overrideNote: "Not variable-controlled. Same doubled-class technique as the panel background above.",
    followUpCandidate: false,
  },
  {
    selector: ".cy-optout-success-text",
    property: "color",
    value: "#14142a",
    line: 745,
    plainLanguageName: "the CCPA opt-out success panel's main message text",
    overrideSelector: ".cy-optout-success-text.cy-optout-success-text",
    overrideNote: "Not variable-controlled. Same doubled-class technique as the panel background above.",
    followUpCandidate: false,
  },
  {
    selector: ".cy-optout-success-subtext",
    property: "color",
    value: "#4e4b66",
    line: 754,
    plainLanguageName: "the CCPA opt-out success panel's smaller subtext",
    overrideSelector: ".cy-optout-success-subtext.cy-optout-success-subtext",
    overrideNote: "Not variable-controlled. Same doubled-class technique as the panel background above.",
    followUpCandidate: false,
  },
  {
    selector: ".cy-always-active",
    property: "color",
    value: "#008000",
    line: 536,
    plainLanguageName: "the \"Always Active\" badge on a required category row",
    overrideSelector: ".cy-always-active.cy-always-active",
    overrideNote:
      "Not variable-controlled, and this badge carries no data-cy-part. Repeating the class lifts the override from a tying (0,1,0) to a winning (0,2,0).",
    followUpCandidate: false,
  },
  {
    selector: ".cy-audit-table",
    property: "background",
    value: "#f4f4f4",
    line: 563,
    plainLanguageName: "the cookie audit table's background, inside an expanded category",
    overrideSelector: ".cy-audit-table.cy-audit-table",
    overrideNote:
      "Not variable-controlled, and this element carries no data-cy-part. Repeating the class lifts the override from a tying (0,1,0) to a winning (0,2,0).",
    followUpCandidate: false,
  },
  {
    selector: ".cy-banner-close",
    property: "color",
    value: "#000",
    line: 325,
    plainLanguageName: "the banner's CCPA-only close icon",
    overrideSelector: '[data-cy-part="banner"] [data-cy-part="close"][data-cy-part]',
    overrideNote:
      '`close` is a shared part name (also used by both dialogs), so this is scoped with the `banner` ancestor part rather than targeted bare — the same scoping the Part & state contract page recommends for every shared part. `[data-cy-part="banner"] [data-cy-part="close"]` alone is (0,2,0), already ahead of the SDK\'s own `.cy-banner-close` at (0,1,0); the attribute is still repeated for consistency with every other entry in this table: `[data-cy-part="banner"] [data-cy-part="close"][data-cy-part] { color: #4b5563; }`.',
    followUpCandidate: false,
  },
];

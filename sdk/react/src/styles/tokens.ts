import type { ThemeConfig } from "@cookieyes/core";

export type ColorScheme = "light" | "dark" | "system";

// Strip characters that would let a value break out of its CSS declaration.
// Empty after stripping → caller falls back to the default.
function safeCssValue(input: unknown, fallback: string): string {
  if (typeof input !== "string") return fallback;
  const cleaned = input
    .replace(/[;{}<>\\]/g, "")
    .replace(/\/\*|\*\//g, "")
    .replace(/[\r\n]/g, " ")
    .trim()
    .slice(0, 200);
  return cleaned.length > 0 ? cleaned : fallback;
}

export function buildCssVariables(theme: ThemeConfig | undefined): string {
  const t = theme ?? {};
  return `
    --cy-primary: ${safeCssValue(t.primaryColor, "#1863dc")};
    --cy-primary-hover: color-mix(in srgb, var(--cy-primary) 85%, black);
    --cy-bg: ${safeCssValue(t.backgroundColor, "#ffffff")};
    --cy-text: ${safeCssValue(t.textColor, "#212121")};
    --cy-muted: ${safeCssValue(t.mutedTextColor, "#6B7280")};
    --cy-border: ${safeCssValue(t.borderColor, "#f4f4f4")};
    --cy-widget-bg: #0056a7;
    --cy-radius: ${safeCssValue(t.borderRadius, "6px")};
    --cy-font: ${safeCssValue(t.fontFamily, "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif")};
  `.trim();
}

export function buildDarkVariables(): string {
  return `
    --cy-bg: #161B27;
    --cy-text: #F3F4F6;
    --cy-muted: #9CA3AF;
    --cy-border: #2D3748;
  `.trim();
}

export function buildStyleSheet(theme: ThemeConfig | undefined, colorScheme: ColorScheme): string {
  const vars = buildCssVariables(theme);
  const darkVars = buildDarkVariables();

  const lightBlock = `[data-cy-theme] { ${vars} }`;

  let darkBlock = "";
  if (colorScheme === "dark") {
    darkBlock = `[data-cy-theme] { ${darkVars} }`;
  } else if (colorScheme !== "light") {
    darkBlock = `@media (prefers-color-scheme: dark) { [data-cy-theme="system"] { ${darkVars} } }`;
  }

  return `
${lightBlock}
${darkBlock}

/* ── Style boundary — isolate our widget from host-app CSS ────────── */
/* Inheritable typography is set explicitly at every root container so   */
/* host stylesheets (Next's Geist font, Vite resets, Tailwind, etc.)     */
/* can't leak in. :where() keeps descendant resets at specificity 0 so   */
/* our cy-* class rules below still override.                            */
.cy-banner-wrap,
.cy-dialog-overlay,
.cy-widget,
.cy-frame-placeholder {
  font-family: var(--cy-font);
  font-size: 14px;
  font-weight: 400;
  font-style: normal;
  line-height: 1.5;
  letter-spacing: normal;
  word-spacing: normal;
  text-align: left;
  text-transform: none;
  text-decoration: none;
  text-indent: 0;
  text-shadow: none;
  color: var(--cy-text);
  direction: ltr;
  white-space: normal;
  box-sizing: border-box;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
:where(.cy-banner-wrap, .cy-dialog-overlay, .cy-widget, .cy-frame-placeholder) *,
:where(.cy-banner-wrap, .cy-dialog-overlay, .cy-widget, .cy-frame-placeholder) *::before,
:where(.cy-banner-wrap, .cy-dialog-overlay, .cy-widget, .cy-frame-placeholder) *::after {
  box-sizing: border-box;
}
:where(.cy-banner-wrap, .cy-dialog-overlay, .cy-frame-placeholder) button,
:where(.cy-banner-wrap, .cy-dialog-overlay, .cy-frame-placeholder) input,
:where(.cy-banner-wrap, .cy-dialog-overlay, .cy-frame-placeholder) label,
:where(.cy-banner-wrap, .cy-dialog-overlay, .cy-frame-placeholder) select,
:where(.cy-banner-wrap, .cy-dialog-overlay, .cy-frame-placeholder) textarea {
  font: inherit;
  color: inherit;
  letter-spacing: inherit;
  text-transform: inherit;
  text-align: inherit;
  margin: 0;
}
:where(.cy-banner-wrap, .cy-dialog-overlay, .cy-frame-placeholder) a {
  color: inherit;
  text-decoration: none;
  background: transparent;
}
:where(.cy-banner-wrap, .cy-dialog-overlay, .cy-frame-placeholder) p,
:where(.cy-banner-wrap, .cy-dialog-overlay, .cy-frame-placeholder) h1,
:where(.cy-banner-wrap, .cy-dialog-overlay, .cy-frame-placeholder) h2,
:where(.cy-banner-wrap, .cy-dialog-overlay, .cy-frame-placeholder) h3,
:where(.cy-banner-wrap, .cy-dialog-overlay, .cy-frame-placeholder) h4,
:where(.cy-banner-wrap, .cy-dialog-overlay, .cy-frame-placeholder) ul,
:where(.cy-banner-wrap, .cy-dialog-overlay, .cy-frame-placeholder) ol,
:where(.cy-banner-wrap, .cy-dialog-overlay, .cy-frame-placeholder) li {
  margin: 0;
  padding: 0;
  list-style: none;
}
:where(.cy-banner-wrap, .cy-dialog-overlay, .cy-frame-placeholder) svg {
  display: inline-block;
  vertical-align: middle;
}

/* ── Banner wrapper ──────────────────────────────────────────────── */
.cy-banner-wrap {
  /* Pure logical grouping — generates no box (display: contents), so the only
     measurable banner element is the visible .cy-banner card below. Inheritable
     typography set on this element (above) still flows to the card. */
  display: contents;
}

/* ── Banner card ─────────────────────────────────────────────────── */
.cy-banner {
  /* Canonical, measurable banner element. Fixed positioning lives here (moved
     off the old full-screen wrapper) so the reported bounding box equals the
     visible card (~13% of 1280×720) and showing the banner never reflows page
     content (CLS 0). Width matches the previous wrapper-padding layout. */
  position: fixed;
  left: 40px;
  bottom: 40px;
  right: auto;
  z-index: 9999999;
  pointer-events: all;
  background: var(--cy-bg);
  color: var(--cy-text);
  border-radius: var(--cy-radius);
  box-shadow: 0 -1px 10px 0 rgba(172, 171, 171, 0.3);
  border: 1px solid var(--cy-border);
  max-width: 440px;
  width: min(440px, calc(100vw - 80px));
  padding: 24px 24px 12px;
  box-sizing: border-box;
  animation: cy-slide-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) both;
}
.cy-banner[data-leaving] {
  animation: cy-fade-out 0.2s ease forwards;
}

@keyframes cy-slide-up {
  from { opacity: 0; transform: translateY(40px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes cy-fade-out {
  from { opacity: 1; transform: translateY(0); }
  to   { opacity: 0; transform: translateY(10px); }
}

/* ── Banner inner layout: text above, actions below ──────────────── */
.cy-banner-text {
  margin-bottom: 0;
}
.cy-banner-title {
  font-size: 18px;
  font-weight: 700;
  line-height: 24px;
  margin: 0 0 12px;
  color: var(--cy-text);
  word-break: break-word;
}
.cy-banner-description {
  font-size: 14px;
  line-height: 24px;
  color: var(--cy-text);
  margin: 0;
  word-break: break-word;
}
.cy-banner-description a {
  color: var(--cy-primary);
  text-decoration: underline;
  text-underline-offset: 2px;
}
.cy-banner-actions {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 16px;
}

/* ── Buttons ─────────────────────────────────────────────────────── */
.cy-btn {
  flex: auto;
  max-width: 100%;
  cursor: pointer;
  font-family: var(--cy-font);
  font-size: 14px;
  font-weight: 500;
  border-radius: 2px;
  padding: 8px;
  line-height: 24px;
  transition: opacity 0.15s;
  text-decoration: none;
  text-align: center;
  overflow-wrap: break-word;
  border: none;
}
.cy-btn:hover { opacity: 0.8; }
.cy-btn:focus-visible {
  outline: 2px solid var(--cy-primary);
  outline-offset: 2px;
}

.cy-btn-primary {
  background: var(--cy-primary);
  color: #fff;
  border: 2px solid var(--cy-primary);
}

.cy-btn-outline {
  background: transparent;
  color: var(--cy-primary);
  border: 2px solid var(--cy-primary);
}

.cy-btn-link {
  background: none;
  color: var(--cy-primary);
  padding: 8px 6px;
  font-size: 14px;
  font-weight: 500;
  text-decoration: underline;
  text-underline-offset: 2px;
  border: none;
}
.cy-btn-link:hover { opacity: 0.75; }

.cy-btn-do-not-sell {
  flex: 1 0 100%;
  width: 100%;
  font-size: 14px;
  line-height: 24px;
  padding: 6px 0;
  font-weight: 500;
  border: none;
  cursor: pointer;
  font-family: var(--cy-font);
  color: var(--cy-primary);
  background: transparent;
  text-decoration: underline;
  text-underline-offset: 2px;
  text-align: left;
  word-break: break-word;
}
.cy-btn-do-not-sell:hover { opacity: 0.75; }

/* ── CCPA close button ───────────────────────────────────────────── */
.cy-banner-close {
  position: absolute;
  right: 9px;
  top: 5px;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  margin: 0;
  height: 24px;
  width: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 0;
  color: #000;
}
.cy-banner-close:hover { opacity: 0.6; }
.cy-banner-close:focus-visible { outline: 2px solid var(--cy-primary); outline-offset: 2px; }

/* ── Show more / less (dialog intro) ─────────────────────────────── */
.cy-show-desc-btn {
  font-size: 14px;
  font-family: var(--cy-font);
  color: var(--cy-primary);
  text-decoration: none;
  line-height: 24px;
  padding: 0;
  margin: 0;
  white-space: nowrap;
  cursor: pointer;
  background: transparent;
  border: none;
}
.cy-show-desc-btn:focus-visible { outline: 2px solid var(--cy-primary); outline-offset: 2px; }

/* ── Banner footer (Powered by) ──────────────────────────────────── */
.cy-banner-footer {
  padding: 20px 0 0;
  display: flex;
  justify-content: center;
  align-items: center;
}
.cy-banner-footer--ccpa {
  border-top: 1px solid lightgray;
  margin: 12px -24px 0;
  padding: 8px 0 0;
}
.cy-branding {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  font-weight: 400;
  line-height: 20px;
  color: var(--cy-text);
  text-decoration: none;
  opacity: 0.7;
}
.cy-branding:hover { opacity: 1; }
.cy-branding svg { line-height: 0; color: inherit; }

/* ── Preferences Dialog overlay ──────────────────────────────────── */
.cy-dialog-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.4);
  z-index: 99999999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  box-sizing: border-box;
  animation: cy-overlay-in 0.3s ease both;
}
@keyframes cy-overlay-in {
  from { opacity: 0; }
  to   { opacity: 1; }
}

.cy-dialog {
  background: var(--cy-bg);
  color: var(--cy-text);
  border-radius: var(--cy-radius);
  box-shadow: 0 32px 68px rgba(0,0,0,0.3);
  width: 100%;
  max-width: 845px;
  max-height: 79vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  font-family: var(--cy-font);
  animation: cy-dialog-slide-up 1s ease both;
}
@keyframes cy-dialog-slide-up {
  from { transform: translateY(100%); }
  to   { transform: translateY(0); }
}

/* ── Dialog header ───────────────────────────────────────────────── */
.cy-dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24px 24px 22px;
  border-bottom: 1px solid var(--cy-border);
  flex-shrink: 0;
}
.cy-dialog-title {
  font-size: 18px;
  font-weight: 700;
  line-height: 24px;
  color: var(--cy-text);
}
.cy-dialog-close {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--cy-text);
  padding: 0;
  margin: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 0;
  flex-shrink: 0;
}
.cy-dialog-close:hover { opacity: 0.6; }
.cy-dialog-close:focus-visible { outline: 2px solid var(--cy-primary); outline-offset: 2px; }
.cy-dialog-close svg {
  width: 10px;
  height: 10px;
}

/* ── Dialog body ─────────────────────────────────────────────────── */
.cy-dialog-body {
  padding: 0 24px;
  flex: 1;
  overflow-y: auto;
  overscroll-behavior: contain;
}
.cy-dialog-content-intro {
  padding: 12px 0;
}
.cy-dialog-desc {
  font-size: 14px;
  color: var(--cy-text);
  line-height: 24px;
  margin: 0;
}
.cy-separator {
  border: none;
  border-bottom: 1px solid var(--cy-border);
  margin: 0;
}

/* ── Accordion categories ────────────────────────────────────────── */
.cy-accordion-wrapper {
  margin-bottom: 10px;
}
.cy-accordion {
  border-bottom: 1px solid var(--cy-border);
}
.cy-accordion:last-child { border-bottom: none; }
.cy-accordion-item {
  display: flex;
  margin-top: 10px;
}
.cy-accordion-header-wrapper {
  flex: 1;
  min-width: 0;
}
.cy-accordion-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}
.cy-accordion-btn {
  background: none;
  border: none;
  cursor: pointer;
  font-family: var(--cy-font);
  font-size: 16px;
  font-weight: 700;
  color: var(--cy-text);
  padding: 0;
  margin: 0;
  text-align: left;
  line-height: 24px;
}
.cy-accordion-btn:focus-visible { outline: 2px solid var(--cy-primary); outline-offset: 2px; }
.cy-always-active {
  color: #008000;
  font-weight: 600;
  font-size: 14px;
  line-height: 24px;
  flex-shrink: 0;
  white-space: nowrap;
}
.cy-accordion-header-des {
  margin: 10px 0 16px;
  font-size: 14px;
  color: var(--cy-text);
  line-height: 24px;
}
.cy-accordion-header-des p {
  font-size: 14px;
  color: inherit;
  line-height: 24px;
  margin: 0;
  word-break: break-word;
}
.cy-accordion-body {
  padding: 0 22px;
  margin-bottom: 16px;
}

/* ── Cookie audit table ──────────────────────────────────────────── */
.cy-audit-table {
  background: #f4f4f4;
  border-radius: 6px;
}
.cy-empty-cookies-text {
  font-size: 12px;
  line-height: 24px;
  color: var(--cy-text);
  margin: 0;
  padding: 10px;
  word-break: break-word;
}
.cy-cookie-des-table {
  font-size: 12px;
  line-height: 24px;
  font-weight: 400;
  padding: 15px 10px;
  border-bottom: 1px solid #ebebeb;
  margin: 0;
  list-style: none;
}
.cy-cookie-des-table:last-child { border-bottom: none; }
.cy-cookie-des-table li {
  list-style-type: none;
  display: flex;
  padding: 3px 0;
}
.cy-cookie-des-table li:first-child { padding-top: 0; }
.cy-cookie-des-table li div:first-child {
  width: 100px;
  flex-shrink: 0;
  font-weight: 600;
  word-break: break-word;
  overflow-wrap: break-word;
}
.cy-cookie-des-table li div:last-child {
  flex: 1;
  word-break: break-word;
  overflow-wrap: break-word;
  margin-left: 8px;
}

/* ── Opt-out buttons (CCPA) ──────────────────────────────────────── */
.cy-btn-cancel {
  background: transparent;
  color: #858585;
  border: 1px solid #dedfe0;
}
.cy-btn-cancel:hover { opacity: 0.8; }

.cy-btn-confirm {
  background: var(--cy-primary);
  color: #fff;
  border: 1px solid var(--cy-primary);
}
.cy-btn-confirm:hover { opacity: 0.8; }

/* ── CCPA Opt-out dialog ─────────────────────────────────────────── */
.cy-optout-dialog {
  max-height: fit-content;
}

/* Footer: no border-top, no padding — spacing comes from inner elements */
.cy-optout-footer {
  flex-shrink: 0;
  position: relative;
}
.cy-optout-action-area {
  padding: 0 24px 22px;
  box-sizing: border-box;
}
.cy-optout-btn-wrapper {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  justify-content: center;
  padding-top: 22px;
}
.cy-optout-btn-wrapper .cy-btn {
  flex: 1 1 auto;
}
.cy-optout-powered-by {
  display: flex;
  justify-content: center;
  align-items: center;
  margin-top: 8px;
  padding-bottom: 12px;
}

.cy-optout-checkbox-wrapper {
  display: flex;
  align-items: center;
  padding: 12px 0;
}
.cy-optout-checkbox {
  appearance: none;
  -webkit-appearance: none;
  width: 20px;
  height: 18.5px;
  min-width: 20px;
  border: 1px solid #000;
  border-radius: 2px;
  background: #fff;
  cursor: pointer;
  flex-shrink: 0;
  position: relative;
  margin: 0;
  padding: 0;
}
.cy-optout-checkbox:checked {
  background: var(--cy-primary);
  border-color: var(--cy-primary);
}
.cy-optout-checkbox:checked::after {
  content: "";
  position: absolute;
  left: 6px;
  bottom: 4px;
  width: 7px;
  height: 13px;
  border: solid #fff;
  border-width: 0 3px 3px 0;
  border-radius: 2px;
  transform: rotate(45deg);
}
.cy-optout-checkbox:focus-visible {
  outline: 2px solid var(--cy-primary);
  outline-offset: 2px;
}
.cy-optout-checkbox-label {
  font-size: 16px;
  font-weight: 700;
  line-height: 24px;
  color: var(--cy-text);
  margin-left: 12px;
  cursor: pointer;
  font-family: var(--cy-font);
}
.cy-optout-checkbox:disabled {
  cursor: not-allowed;
}
.cy-optout-checkbox:disabled + .cy-optout-checkbox-label {
  cursor: not-allowed;
}

/* ── CCPA Opt-out success state ──────────────────────────────────── */
.cy-optout-success {
  background: #E5F4EF;
  border-radius: 8px;
  padding: 8px 12px;
  box-sizing: border-box;
  outline: none;
  margin: 0 auto;
  width: 100%;
}
.cy-optout-success-inner {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.cy-optout-success-row {
  display: flex;
  align-items: flex-start;
}
.cy-optout-success-icon {
  width: 20px;
  flex-shrink: 0;
  color: #00754E;
}
.cy-optout-success-text {
  margin-inline-start: 8px;
  margin-top: 1px;
  font-size: 13px;
  font-weight: 400;
  color: #14142A;
  line-height: 20px;
}
.cy-optout-success-subtext-wrapper { }
.cy-optout-success-subtext {
  margin: 0;
  font-size: 12px;
  font-weight: 400;
  color: #4E4B66;
  line-height: 20px;
}

/* ── Toggle switch (pill) ────────────────────────────────────────── */
.cy-toggle {
  position: relative;
  flex-shrink: 0;
  width: 44px;
  height: 24px;
  display: flex;
  cursor: pointer;
}
.cy-toggle input {
  position: absolute;
  width: 44px;
  height: 24px;
  margin: 0;
  opacity: 0;
  top: 0;
  left: 0;
  z-index: 1;
  cursor: pointer;
}
.cy-toggle-track {
  position: absolute;
  inset: 0;
  background: #d0d5d2;
  border-radius: 50px;
  transition: background 0.18s ease;
}
.cy-toggle input:checked ~ .cy-toggle-track {
  background: var(--cy-primary);
}
.cy-toggle-thumb {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 20px;
  height: 20px;
  background: #fff;
  border-radius: 50%;
  box-shadow: 0 1px 3px rgba(0,0,0,0.25);
  transition: transform 0.4s ease;
  pointer-events: none;
}
.cy-toggle input:checked ~ .cy-toggle-track .cy-toggle-thumb {
  transform: translateX(20px);
}
.cy-toggle input:focus-visible ~ .cy-toggle-track {
  outline: 2px solid var(--cy-primary);
  outline-offset: 2px;
}

/* ── Dialog footer ───────────────────────────────────────────────── */
.cy-dialog-footer {
  padding: 22px 24px 12px;
  flex-shrink: 0;
  border-top: 1px solid var(--cy-border);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  position: relative;
}
.cy-dialog-footer-shadow {
  display: block;
  width: 100%;
  height: 40px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0) 0%, var(--cy-bg) 100%);
  position: absolute;
  bottom: calc(100% - 1px);
  left: 0;
  pointer-events: none;
}
.cy-dialog-footer-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  width: 100%;
  justify-content: center;
}
.cy-dialog-footer-actions .cy-btn {
  flex: auto;
}

/* ── Widget (floating re-open) ───────────────────────────────────── */
.cy-widget {
  position: fixed;
  bottom: 15px;
  left: 15px;
  z-index: 99999999;
  width: 45px;
  height: 45px;
  border-radius: 50%;
  background: var(--cy-widget-bg);
  color: #fff;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: cy-widget-pop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) both;
}
.cy-widget[data-pos="bottom-right"] { left: auto; right: 15px; }
.cy-widget:focus-visible { outline: 3px solid var(--cy-primary); outline-offset: 3px; }
/* Tooltip */
.cy-widget::before {
  content: attr(data-tooltip);
  position: absolute;
  background: #4E4B66;
  color: #fff;
  left: calc(100% + 7px);
  font-size: 12px;
  line-height: 16px;
  width: max-content;
  padding: 4px 8px;
  border-radius: 4px;
  font-family: var(--cy-font);
  opacity: 0;
  pointer-events: none;
  white-space: nowrap;
}
.cy-widget::after {
  content: "";
  position: absolute;
  border: 5px solid transparent;
  border-right-color: #4E4B66;
  left: calc(100% + 2px);
  opacity: 0;
  pointer-events: none;
}
.cy-widget:hover::before,
.cy-widget:hover::after { opacity: 1; }
@keyframes cy-widget-pop {
  from { opacity: 0; transform: scale(0.4); }
  to   { opacity: 1; transform: scale(1); }
}

/* ── ConsentFrame placeholder ────────────────────────────────────── */
.cy-frame-placeholder {
  background: var(--cy-bg);
  border: 1.5px dashed var(--cy-border);
  border-radius: calc(var(--cy-radius) * 0.6);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 32px 24px;
  text-align: center;
  font-family: var(--cy-font);
  color: var(--cy-muted);
  font-size: 14px;
  min-height: 120px;
}

/* ── Responsive ──────────────────────────────────────────────────── */

/* Banner: full-width + stacked buttons at <=440px (matches reference) */
@media (max-width: 440px) {
  .cy-banner {
    left: 0;
    right: 0;
    bottom: 0;
    width: 100%;
    max-width: 100%;
    border-radius: 0;
  }
  .cy-banner-actions {
    flex-direction: column;
    gap: 10px;
  }
  .cy-banner-actions .cy-btn {
    width: 100%;
  }
  /* Order: Accept All first, Customise second, Reject All third */
  .cy-banner-actions .cy-btn:nth-child(1) { order: 2; }
  .cy-banner-actions .cy-btn:nth-child(2) { order: 3; }
  .cy-banner-actions .cy-btn:nth-child(3) { order: 1; }
  .cy-banner-description {
    max-height: 40vh;
    overflow-y: auto;
  }
}

/* Dialog: tighter at <=845px */
@media (max-width: 845px) {
  .cy-dialog-overlay {
    padding: 8px;
  }
}

/* Dialog: full-screen at <=576px */
@media (max-width: 576px) {
  .cy-dialog-overlay {
    padding: 0;
    align-items: stretch;
  }
  .cy-dialog {
    max-width: 100%;
    border-radius: 0;
    max-height: 100vh;
    height: 100vh;
  }
  .cy-dialog-footer-actions {
    flex-direction: column;
    gap: 10px;
  }
  .cy-dialog-footer-actions .cy-btn {
    width: 100%;
  }
  /* Order: Accept All first, Save My Preferences second, Reject All third */
  .cy-dialog-footer-actions .cy-btn:nth-child(1) { order: 3; }
  .cy-dialog-footer-actions .cy-btn:nth-child(2) { order: 2; }
  .cy-dialog-footer-actions .cy-btn:nth-child(3) { order: 1; }
}

@media (max-width: 425px) {
  .cy-accordion-body { padding: 0 15px; }
  .cy-toggle,
  .cy-toggle input { width: 38px; height: 21px; }
  .cy-toggle-thumb { width: 17px; height: 17px; }
  .cy-toggle input:checked ~ .cy-toggle-track .cy-toggle-thumb { transform: translateX(17px); }
}

@media (max-width: 352px) {
  .cy-banner-title { font-size: 16px; }
  .cy-banner-description,
  .cy-banner-description *,
  .cy-banner-actions .cy-btn,
  .cy-btn-do-not-sell { font-size: 12px; }
  .cy-dialog-title { font-size: 16px; }
  .cy-dialog-header { padding: 16px 24px; }
  .cy-dialog-desc,
  .cy-dialog-desc *,
  .cy-accordion-header-des,
  .cy-accordion-header-des *,
  .cy-show-desc-btn,
  .cy-banner-description a { font-size: 12px; }
  .cy-accordion-btn { font-size: 14px; }
  .cy-optout-checkbox-label { font-size: 14px; }
  .cy-optout-checkbox { width: 16px; min-width: 16px; height: 16px; }
  .cy-optout-checkbox:checked::after { left: 5px; bottom: 4px; width: 3px; height: 9px; }
}

@media (max-height: 480px) {
  .cy-banner { max-height: 100vh; overflow-y: auto; }
  .cy-banner-description { max-height: unset; overflow-y: unset; }
}

@media (min-width: 576px) and (max-height: 660px) {
  .cy-banner-description { max-height: 40vh; overflow-y: auto; }
}

@media (max-height: 576px) {
  .cy-dialog { height: 100vh; overflow: auto; }
  .cy-dialog-body { overflow: unset; }
}

.cy-banner-description img,
.cy-dialog-desc img,
.cy-accordion-header-des img {
  min-height: 25px;
  min-width: 25px;
}
`.trim();
}

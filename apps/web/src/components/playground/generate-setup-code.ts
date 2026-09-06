import {
  BUILT_IN_CATEGORY_IDS,
  DEFAULT_CONFIG,
  FONTS,
  type PlaygroundConfig,
  type PlaygroundText,
  REQUIRED_CATEGORY_ID,
} from "./playground-config";

/**
 * Turns the playground's state into setup a visitor can paste into their own app.
 *
 * Two rules decide everything here. The output must match what the quick start teaches,
 * because a visitor who finds the two disagreeing has found a bug in one of them. And a
 * field is omitted only when leaving it out would not change behaviour — brevity that
 * alters the result is a trap, not a kindness.
 */

const INDENT = "  ";

function pad(depth: number, line: string): string {
  return INDENT.repeat(depth) + line;
}

function quote(value: string): string {
  // Our font stacks contain single quotes, so double-quoting and escaping is simpler than
  // choosing a quote style per value.
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

/** Unpadded `key: value,` lines for each theme value the visitor moved off its default. */
function changedThemeEntries(config: PlaygroundConfig): string[] {
  const entries: string[] = [];
  if (config.primaryColor !== DEFAULT_CONFIG.primaryColor) {
    entries.push(`primaryColor: ${quote(config.primaryColor)},`);
  }
  if (config.borderRadius !== DEFAULT_CONFIG.borderRadius) {
    entries.push(`borderRadius: ${quote(`${config.borderRadius}px`)},`);
  }
  const fontFamily = FONTS[config.font].code;
  if (fontFamily) entries.push(`fontFamily: ${quote(fontFamily)},`);
  return entries;
}

/** Unpadded lines for each wording field the visitor edited. */
function changedTextEntries(config: PlaygroundConfig): string[] {
  const keys = Object.keys(DEFAULT_CONFIG.text) as (keyof PlaygroundText)[];
  return keys
    .filter((key) => config.text[key] !== DEFAULT_CONFIG.text[key])
    .map((key) => `${key}: ${quote(config.text[key])},`);
}

function themeBlock(config: PlaygroundConfig, depth: number): string[] {
  const entries = changedThemeEntries(config);
  if (entries.length === 0) return [];
  return [
    pad(depth, "theme: {"),
    ...entries.map((entry) => pad(depth + 1, entry)),
    pad(depth, "},"),
  ];
}

function i18nBlock(config: PlaygroundConfig, depth: number): string[] {
  const entries = changedTextEntries(config);
  if (entries.length === 0) return [];
  // Overrides are deep-merged onto English, so only the edited keys need to appear.
  return [
    pad(depth, "i18n: {"),
    pad(depth + 1, "messages: {"),
    pad(depth + 2, "en: {"),
    ...entries.map((entry) => pad(depth + 3, entry)),
    pad(depth + 2, "},"),
    pad(depth + 1, "},"),
    pad(depth, "},"),
  ];
}

function categoriesBlock(config: PlaygroundConfig, depth: number): string[] {
  const unchanged =
    config.categories.length === BUILT_IN_CATEGORY_IDS.length &&
    config.categories.every((id, index) => id === BUILT_IN_CATEGORY_IDS[index]);
  if (unchanged) return [];

  const entries = config.categories.map((id) => {
    const parts = [`id: ${quote(id)}`];
    if (id === REQUIRED_CATEGORY_ID) parts.push("required: true");
    const label = config.customLabels[id];
    if (label && !BUILT_IN_CATEGORY_IDS.includes(id)) parts.push(`label: ${quote(label)}`);
    return pad(depth + 1, `{ ${parts.join(", ")} },`);
  });

  return [pad(depth, "categories: ["), ...entries, pad(depth, "],")];
}

export function generateSetupCode(config: PlaygroundConfig): string {
  return [
    '"use client";',
    "",
    // The one import people forget. Without it the banner renders unstyled and looks
    // broken, so it is never conditional on anything.
    'import "@cookieyes/react/styles.css";',
    'import { CookieBanner, CookiePreferences, RecallButton, initCookieYes } from "@cookieyes/react";',
    "",
    "initCookieYes({",
    pad(1, 'mode: "cookie-only",'),
    // Always spelled out: left unset, the SDK resolves `regulation` by region and falls
    // back to `colorScheme: "system"`, so omitting them would make the copied code behave
    // differently from the preview the visitor just approved.
    pad(1, `regulation: ${quote(config.regulation)},`),
    pad(1, `colorScheme: ${quote(config.colorScheme)},`),
    ...themeBlock(config, 1),
    ...i18nBlock(config, 1),
    ...categoriesBlock(config, 1),
    "});",
    "",
    "export function CookieYesRoot() {",
    pad(1, "return ("),
    pad(2, "<>"),
    pad(3, "<CookieBanner />"),
    pad(3, "<CookiePreferences />"),
    pad(3, "<RecallButton />"),
    pad(2, "</>"),
    pad(1, ");"),
    "}",
    "",
  ].join("\n");
}

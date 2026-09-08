import { DEFAULT_CATEGORIES, defaultTranslations, type TranslationMap } from "@cookieyes/react";

/**
 * The playground's own state shape, and the contract it speaks to the preview frame.
 *
 * One module owns this because the preview and the generated code are both derived from
 * it. If they read different objects, the code a visitor copies can disagree with the
 * banner they just approved — the single failure this page exists to prevent.
 */

/**
 * The wording fields the playground exposes, keyed by the SDK's own translation keys.
 *
 * Both regulations are covered because the banner renders different text for each — see
 * WORDING_FIELDS in ControlsPanel for which are offered when.
 */
export type PlaygroundText = Pick<
  TranslationMap,
  | "bannerTitle"
  | "bannerDescription"
  | "ccpaDescription"
  | "doNotSell"
  | "acceptAll"
  | "rejectAll"
  | "managePreferences"
>;

export type FontChoice = "system" | "inter" | "poppins";

export type PlaygroundConfig = {
  regulation: "GDPR" | "CCPA";
  colorScheme: "light" | "dark";
  primaryColor: string;
  /** Slider value in pixels; becomes a `8px`-style string only at the edges. */
  borderRadius: number;
  font: FontChoice;
  text: PlaygroundText;
  /** Ordered category ids. `necessary` is always first and cannot be removed. */
  categories: string[];
  /** Labels for ids the visitor added. Built-in ids are absent — they translate themselves. */
  customLabels: Record<string, string>;
};

/**
 * Inter and Poppins are already loaded by the site's root layout as `--font-inter` and
 * `--font-poppins`, so the preview costs no extra font request.
 *
 * The generated code cannot use those variables — they exist on this site, not in the
 * visitor's project — so each choice carries a second, portable value for the output.
 */
export const FONTS: Record<FontChoice, { label: string; preview?: string; code?: string }> = {
  system: { label: "System" },
  inter: {
    label: "Inter",
    preview: "var(--font-inter), sans-serif",
    code: "'Inter', sans-serif",
  },
  poppins: {
    label: "Poppins",
    preview: "var(--font-poppins), sans-serif",
    code: "'Poppins', sans-serif",
  },
};

export const BUILT_IN_CATEGORY_IDS: string[] = DEFAULT_CATEGORIES.map((category) => category.id);

/**
 * What to call a category on screen — the same name the preferences dialog shows, so the
 * controls and the preview never disagree about what a row is.
 */
export function categoryLabel(id: string, customLabels: Record<string, string>): string {
  return customLabels[id] ?? defaultTranslations.categories[id]?.label ?? id;
}

/** The one category that can never be switched off — removing it would invalidate the set. */
export const REQUIRED_CATEGORY_ID = "necessary";

/** The four brand colours offered as one-click swatches, alongside the free-text hex field. */
export const COLOUR_SWATCHES = ["#1863dc", "#18181b", "#0f7b52", "#8250df"];

/**
 * What the playground starts on — deliberately not what the SDK falls back to.
 *
 * `colorScheme` defaults to `"system"` in the SDK and `regulation` is resolved by region
 * detection. Neither can be *shown*: one depends on the visitor's OS, the other on where
 * they are. The playground pins both so every visitor sees the same thing, which is also
 * why the generated code always spells them out (see generate-setup-code.ts).
 */
export const DEFAULT_CONFIG: PlaygroundConfig = {
  regulation: "GDPR",
  colorScheme: "light",
  primaryColor: "#1863dc",
  borderRadius: 8,
  font: "system",
  text: {
    bannerTitle: defaultTranslations.bannerTitle,
    bannerDescription: defaultTranslations.bannerDescription,
    ccpaDescription: defaultTranslations.ccpaDescription,
    doNotSell: defaultTranslations.doNotSell,
    acceptAll: defaultTranslations.acceptAll,
    rejectAll: defaultTranslations.rejectAll,
    managePreferences: defaultTranslations.managePreferences,
  },
  categories: BUILT_IN_CATEGORY_IDS,
  customLabels: {},
};

/** Where the preview document lives. The iframe's `src`, and the route that renders it. */
export const PREVIEW_PATH = "/playground/preview";

const CHANNEL = "cy-playground";

export type PreviewMessage =
  | { channel: typeof CHANNEL; type: "config"; config: PlaygroundConfig }
  | { channel: typeof CHANNEL; type: "replay" };

export type PreviewReply = { channel: typeof CHANNEL; type: "ready" };

export function configMessage(config: PlaygroundConfig): PreviewMessage {
  return { channel: CHANNEL, type: "config", config };
}

export function replayMessage(): PreviewMessage {
  return { channel: CHANNEL, type: "replay" };
}

export function readyReply(): PreviewReply {
  return { channel: CHANNEL, type: "ready" };
}

/**
 * Both ends run same-origin, so a message that fails either check came from somewhere
 * else on the page — another embed, an extension — and is ignored rather than trusted.
 */
function isOurs(event: MessageEvent): boolean {
  return (
    event.origin === window.location.origin &&
    typeof event.data === "object" &&
    event.data !== null &&
    (event.data as { channel?: unknown }).channel === CHANNEL
  );
}

export function parsePreviewMessage(event: MessageEvent): PreviewMessage | null {
  if (!isOurs(event)) return null;
  const data = event.data as PreviewMessage;
  return data.type === "config" || data.type === "replay" ? data : null;
}

export function parsePreviewReply(event: MessageEvent): PreviewReply | null {
  if (!isOurs(event)) return null;
  const data = event.data as PreviewReply;
  return data.type === "ready" ? data : null;
}

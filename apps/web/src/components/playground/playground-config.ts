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

/**
 * Two stand-in tags the preview gates for real, so a visitor can watch blocking happen
 * rather than read a claim that it did.
 *
 * Named plainly and served from this site. Logging real vendor names while loading none of
 * them would be exactly the kind of thing this page exists to disprove. Two, on different
 * categories, so switching one category off visibly leaves the other running.
 */
export const DEMO_SCRIPTS = [
  {
    id: "analytics-tag",
    label: "Analytics tag",
    category: "analytics",
    src: "/playground/analytics-tag.js",
  },
  {
    id: "ad-tag",
    label: "Ad tag",
    category: "advertisement",
    src: "/playground/ad-tag.js",
  },
] as const;

export type DemoScript = (typeof DEMO_SCRIPTS)[number];

/** One event from the preview. `level` picks the colour, exactly as the design does. */
export type LogEvent = {
  time: string;
  level: "info" | "allowed" | "blocked";
  message: string;
  meta?: string;
};

/**
 * An event once the parent has filed it. The number is assigned here, not in the frame:
 * the frame reloads on Replay and Reset, which would restart any counter it kept and
 * collide with entries already on the list.
 */
export type LogEntry = LogEvent & { seq: number };

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

export type PreviewMessage = { channel: typeof CHANNEL; type: "config"; config: PlaygroundConfig };

export type PreviewReply =
  | { channel: typeof CHANNEL; type: "ready" }
  /** One real event from the preview. `allowed` is only ever sent by a script that ran. */
  | { channel: typeof CHANNEL; type: "log"; entry: LogEvent };

export function configMessage(config: PlaygroundConfig): PreviewMessage {
  return { channel: CHANNEL, type: "config", config };
}

export function readyReply(): PreviewReply {
  return { channel: CHANNEL, type: "ready" };
}

export function logReply(entry: LogEvent): PreviewReply {
  return { channel: CHANNEL, type: "log", entry };
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
  return data.type === "config" ? data : null;
}

export function parsePreviewReply(event: MessageEvent): PreviewReply | null {
  if (!isOurs(event)) return null;
  const data = event.data as PreviewReply;
  return data.type === "ready" || data.type === "log" ? data : null;
}

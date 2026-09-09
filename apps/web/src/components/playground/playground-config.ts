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
 * Five stand-in tags the preview gates for real, so a visitor can watch blocking happen
 * rather than read a claim that it did.
 *
 * One is `necessary`: it runs before any decision, beside four that are held, which shows
 * the rule rather than restating it. Two per gated category shows that a category is what
 * gates, not the individual script.
 *
 * Named generically and served from this site. The design names real vendors — analytics
 * and ad products it never loads — which is the one thing a consent company should not be
 * caught doing.
 */
export const DEMO_SCRIPTS = [
  {
    id: "session-cookie",
    label: "session cookie",
    category: "necessary",
    src: "/playground/session-cookie.js",
  },
  {
    id: "analytics-tag",
    label: "analytics tag",
    category: "analytics",
    src: "/playground/analytics-tag.js",
  },
  {
    id: "heatmap-tag",
    label: "heatmap tag",
    category: "analytics",
    src: "/playground/heatmap-tag.js",
  },
  { id: "ad-pixel", label: "ad pixel", category: "advertisement", src: "/playground/ad-pixel.js" },
  {
    id: "retargeting-tag",
    label: "retargeting tag",
    category: "advertisement",
    src: "/playground/retargeting-tag.js",
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

/** Corner rounding runs 0–20px, the range the design's slider offers. */
export const MAX_RADIUS = 20;

/** The four brand colours offered as one-click swatches, alongside the free-text hex field. */
export const COLOUR_SWATCHES = ["#136fe8", "#14142a", "#00754e", "#8250df"];

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
  primaryColor: "#136fe8",
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

/**
 * The width the preview frame pretends to be, in CSS pixels.
 *
 * The panel it sits in is only ~650px wide, and a banner laid out for that reads as a
 * phone. Giving the frame a real desktop viewport and scaling the whole thing down instead
 * shows the banner at the size and position a visitor would actually meet it.
 *
 * 1000 rather than a wider desktop: the frame is shown at about two thirds size, so the
 * banner's own body text still lands around 12px on screen and stays readable. At 1280 it
 * came out near 9px, which is a picture of a banner rather than a banner you can read.
 */
export const PREVIEW_WIDTH = 1000;

/**
 * How small the scaled-down desktop preview is allowed to get before it stops being one.
 *
 * Once the panel goes full width on a phone, a 1280px page shrinks to under a third and the
 * banner's own text is unreadable — at which point the honest preview is the banner at its
 * real size, which is what a visitor on that phone would see anyway.
 */
export const MIN_PREVIEW_SCALE = 0.5;

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

import {
  BUILT_IN_CATEGORY_IDS,
  DEFAULT_CONFIG,
  FONTS,
  type FontChoice,
  type PlaygroundConfig,
  type PlaygroundText,
  REQUIRED_CATEGORY_ID,
} from "./playground-config";

/**
 * Turns an evaluated config object back into playground state.
 *
 * Strict on purpose. Anything the controls cannot show — an unknown key, a font not on
 * offer, a value of the wrong shape — is refused rather than half-applied. A setting that
 * reached the preview but not the controls would leave the two panels describing different
 * things, which is the one failure this page exists to prevent.
 */

export type ReadResult = { ok: true; config: PlaygroundConfig } | { ok: false; error: string };

const TEXT_KEYS = Object.keys(DEFAULT_CONFIG.text) as (keyof PlaygroundText)[];
const RADIUS_PATTERN = /^(\d{1,2})px$/;

function fail(error: string): ReadResult {
  return { ok: false, error };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Names every key we were not expecting, so the message points at the actual problem. */
function unknownKeys(
  value: Record<string, unknown>,
  allowed: string[],
  where: string,
): string | null {
  const extra = Object.keys(value).filter((key) => !allowed.includes(key));
  if (extra.length === 0) return null;
  const list = extra.map((key) => `\`${key}\``).join(", ");
  return `${where} does not support ${list} here. The controls have no way to show it.`;
}

function readTheme(value: unknown, into: PlaygroundConfig): string | null {
  if (!isRecord(value)) return "`theme` must be an object.";
  const extra = unknownKeys(
    value,
    ["primaryColor", "borderRadius", "fontFamily"],
    "The playground",
  );
  if (extra) return extra;

  if (value.primaryColor !== undefined) {
    if (typeof value.primaryColor !== "string") return "`primaryColor` must be a string.";
    into.primaryColor = value.primaryColor;
  }
  if (value.borderRadius !== undefined) {
    const match = typeof value.borderRadius === "string" && RADIUS_PATTERN.exec(value.borderRadius);
    if (!match) return '`borderRadius` must look like `"8px"`, from 0 to 16.';
    const px = Number(match[1]);
    if (px > 16) return '`borderRadius` goes up to `"16px"` here — that is the slider\'s range.';
    into.borderRadius = px;
  }
  if (value.fontFamily !== undefined) {
    const match = (Object.keys(FONTS) as FontChoice[]).find(
      (choice) => FONTS[choice].code === value.fontFamily,
    );
    if (!match) return "`fontFamily` must be one of the fonts the Font control offers.";
    into.font = match;
  }
  return null;
}

function readI18n(value: unknown, into: PlaygroundConfig): string | null {
  if (!isRecord(value)) return "`i18n` must be an object.";
  const extraTop = unknownKeys(value, ["messages"], "The playground");
  if (extraTop) return extraTop;
  if (value.messages === undefined) return null;

  if (!isRecord(value.messages)) return "`messages` must be an object.";
  const extraLang = unknownKeys(
    value.messages,
    ["en"],
    "The playground only edits English, so `messages`",
  );
  if (extraLang) return extraLang;
  if (value.messages.en === undefined) return null;

  const en = value.messages.en;
  if (!isRecord(en)) return "`messages.en` must be an object.";
  const extraKeys = unknownKeys(en, TEXT_KEYS, "The Wording controls");
  if (extraKeys) return extraKeys;

  for (const key of TEXT_KEYS) {
    const text = en[key];
    if (text === undefined) continue;
    if (typeof text !== "string") return `\`${key}\` must be a string.`;
    into.text = { ...into.text, [key]: text };
  }
  return null;
}

function readCategories(value: unknown, into: PlaygroundConfig): string | null {
  if (!Array.isArray(value)) return "`categories` must be an array.";
  if (value.length === 0) return "`categories` needs at least one entry.";

  const ids: string[] = [];
  const labels: Record<string, string> = {};

  for (const entry of value) {
    if (!isRecord(entry)) return 'Every category must be an object like `{ id: "analytics" }`.';
    const extra = unknownKeys(entry, ["id", "required", "label"], "A category");
    if (extra) return extra;

    const { id, label } = entry;
    if (typeof id !== "string" || id.length === 0) return "Every category needs a string `id`.";
    if (ids.includes(id)) return `\`${id}\` is listed twice.`;
    if (label !== undefined && typeof label !== "string") return "`label` must be a string.";

    ids.push(id);
    if (label && !BUILT_IN_CATEGORY_IDS.includes(id)) labels[id] = label;
  }

  // The SDK falls back to the built-in five, with a console warning, if nothing is
  // required — so an edit that drops it would silently stop matching the preview.
  if (!ids.includes(REQUIRED_CATEGORY_ID)) {
    return `\`${REQUIRED_CATEGORY_ID}\` cannot be removed — one category must stay required.`;
  }

  into.categories = ids;
  into.customLabels = labels;
  return null;
}

export function readConfig(value: unknown): ReadResult {
  if (!isRecord(value)) return fail("The config must be an object.");

  const extra = unknownKeys(
    value,
    ["mode", "regulation", "colorScheme", "theme", "i18n", "categories"],
    "The playground",
  );
  if (extra) return fail(extra);

  if (value.mode !== undefined && value.mode !== "cookie-only") {
    return fail('`mode` is `"cookie-only"` here — the preview has no backend to talk to.');
  }
  if (
    value.regulation !== undefined &&
    value.regulation !== "GDPR" &&
    value.regulation !== "CCPA"
  ) {
    return fail('`regulation` must be `"GDPR"` or `"CCPA"`.');
  }
  if (
    value.colorScheme !== undefined &&
    value.colorScheme !== "light" &&
    value.colorScheme !== "dark"
  ) {
    return fail(
      '`colorScheme` must be `"light"` or `"dark"` — the preview cannot show `"system"`.',
    );
  }

  // Built from defaults, not from the current state: the text is the whole truth, so a key
  // deleted from it must go back to its default rather than linger.
  const next: PlaygroundConfig = { ...DEFAULT_CONFIG, text: { ...DEFAULT_CONFIG.text } };
  if (value.regulation) next.regulation = value.regulation;
  if (value.colorScheme) next.colorScheme = value.colorScheme;

  for (const [key, read] of [
    ["theme", readTheme],
    ["i18n", readI18n],
    ["categories", readCategories],
  ] as const) {
    if (value[key] === undefined) continue;
    const error = read(value[key], next);
    if (error) return fail(error);
  }

  return { ok: true, config: next };
}

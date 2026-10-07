import reactManifest from "../../../../sdk/react/package.json";
import announcementFile from "../../content/announcement.json";
import { source } from "./source";

/**
 * The three looks from the design. `release` is a minor release or a significant feature;
 * `breaking` is the loud one, for a major release, a breaking change or a deprecation;
 * `event` is news that is not a package release, so it carries no version.
 */
export const ANNOUNCEMENT_KINDS = ["release", "breaking", "event"] as const;
export type AnnouncementKind = (typeof ANNOUNCEMENT_KINDS)[number];

/**
 * Longest message and link text the build accepts. Measured in the browser: at these lengths
 * the strip stays on one line from 1024px wide, and wraps to at most two lines between 601px
 * and 1023px. Raise them only after measuring again.
 */
export const MESSAGE_MAX = 60;
export const LINK_TEXT_MAX = 24;

/**
 * Phones show the message and the link's arrow in a 234px column (on a 320px screen). How
 * many lines that takes depends on the words, not only the length: one long word can push
 * a 50-character message to three lines. So the wrap is simulated with 8px for every
 * character, wider than Inter's average at 14px. Checked against the browser for 3000
 * random messages, it never counted fewer lines than the real ones; it does reject some
 * messages that would just fit.
 */
const PHONE_LINE_PX = 234;
const PHONE_CHAR_PX = 8;
const PHONE_SPACE_PX = 4;
const PHONE_ARROW_PX = 28;

function phoneLines(message: string): number {
  let lines = 1;
  let x = 0;
  for (const word of message.split(" ")) {
    const width = word.length * PHONE_CHAR_PX;
    if (x === 0) x = width;
    else if (x + PHONE_SPACE_PX + width <= PHONE_LINE_PX) x += PHONE_SPACE_PX + width;
    else {
      lines++;
      x = width;
    }
  }
  return x + PHONE_ARROW_PX > PHONE_LINE_PX ? lines + 1 : lines;
}

/**
 * Link text that does not say where it goes. Screen readers list links by their text alone,
 * so "Learn more" tells a visitor nothing.
 */
const VAGUE_LINK_TEXT =
  /^(learn more|read more|find out more|see more|more|more info|details|click here|here|this)$/i;

/** Days an announcement stays up when `expires` is not set. */
export const DEFAULT_LIFETIME_DAYS = 30;

/** An announcement that passed every check, ready to render. */
export interface Announcement {
  id: string;
  kind: AnnouncementKind;
  message: string;
  linkText: string;
  href: string;
  /** `href` without query, hash or trailing slash: the page that counts as visited. */
  linkPath: string;
  /** The @cookieyes/react version, as the hero shows it. Absent for `event`. */
  version?: string | undefined;
  /** Start of the expiry day, UTC, in milliseconds. Hidden from then on. */
  expiresAt: number;
}

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 24 * 60 * 60 * 1000;
/** Pages outside the docs tree that an announcement may link to. */
const OTHER_PAGES = new Set(["/playground"]);

function fail(problem: string): never {
  throw new Error(`content/announcement.json: ${problem}`);
}

function parseDate(field: string, value: unknown): number {
  if (typeof value !== "string" || !DATE.test(value)) fail(`"${field}" must be a YYYY-MM-DD date.`);
  const time = Date.parse(`${value}T00:00:00Z`);
  if (Number.isNaN(time)) fail(`"${field}" is not a real date: ${value}.`);
  return time;
}

function text(field: string, value: unknown, max: number): string {
  if (typeof value !== "string" || value.trim() === "") fail(`"${field}" is required.`);
  if (value.length > max) fail(`"${field}" is ${value.length} characters; the limit is ${max}.`);
  if (value.includes("\u2014")) fail(`"${field}" has an em dash; use a colon or a comma.`);
  return value;
}

/**
 * Throws unless `href` is a page that exists. The site link is pushed at every visitor, so a
 * broken one is caught here, at build time, not by them. The homepage is refused: visiting
 * the linked page dismisses the announcement, so it would never be seen there.
 */
function checkHref(href: unknown): { href: string; linkPath: string } {
  if (typeof href !== "string" || href === "") fail(`"href" is required.`);
  const linkPath = href.replace(/[?#].*$/, "").replace(/\/+$/, "");
  if (href.startsWith("https://")) return { href, linkPath };
  if (!href.startsWith("/") || href.startsWith("//")) {
    fail(`"href" must be a site path such as /docs/changelog or an https:// URL.`);
  }
  if (linkPath === "") fail(`"href" cannot be the homepage.`);
  const exists = linkPath.startsWith("/docs/")
    ? source.getPage(linkPath.split("/").slice(2)) !== undefined
    : OTHER_PAGES.has(linkPath);
  if (!exists) fail(`"href" points to ${linkPath}, which is not a page on this site.`);
  return { href, linkPath };
}

/**
 * The announcement to show, or null when there is none or it has expired. Called while the
 * site builds, so any mistake in content/announcement.json fails the build with a message
 * that names it.
 */
export function getAnnouncement(now = Date.now()): Announcement | null {
  const entry: unknown = announcementFile;
  if (entry === null) return null;
  if (typeof entry !== "object" || Array.isArray(entry)) fail("must be one object, or null.");
  const raw = entry as Record<string, unknown>;

  if (typeof raw.id !== "string" || !/^[\w.-]+$/.test(raw.id)) {
    fail(`"id" is required: letters, digits, dots, dashes, underscores.`);
  }
  if (!ANNOUNCEMENT_KINDS.includes(raw.kind as AnnouncementKind)) {
    fail(`"kind" must be one of: ${ANNOUNCEMENT_KINDS.join(", ")}.`);
  }
  const kind = raw.kind as AnnouncementKind;
  const published = parseDate("published", raw.published);
  const expiresAt =
    raw.expires === undefined
      ? published + DEFAULT_LIFETIME_DAYS * DAY_MS
      : parseDate("expires", raw.expires);
  if (expiresAt <= published) fail(`"expires" must be after "published".`);

  const message = text("message", raw.message, MESSAGE_MAX);
  if (phoneLines(message) > 2) {
    fail(`"message" would wrap to three lines on a small phone. Shorten it, or use shorter words.`);
  }
  const linkText = text("linkText", raw.linkText, LINK_TEXT_MAX);
  if (VAGUE_LINK_TEXT.test(linkText.trim().replace(/[.!]+$/, ""))) {
    fail(`"linkText" must say where the link goes, such as "Read the release notes".`);
  }

  const announcement: Announcement = {
    id: raw.id,
    kind,
    message,
    linkText,
    ...checkHref(raw.href),
    version: kind === "event" ? undefined : reactManifest.version,
    expiresAt,
  };
  return now >= expiresAt ? null : announcement;
}

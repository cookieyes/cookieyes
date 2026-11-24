import { type ConsentModeOptions, googleConsentModeSnippet } from "@cookieyes/scripts";
import { CRITICAL_CSS } from "./styles.js";

function escapeAttribute(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

/** @internal The Consent Mode default as the script's text, or undefined when it is not asked for. */
export function _consentModeText(
  option: boolean | ConsentModeOptions | undefined,
): string | undefined {
  if (!option) return undefined;
  return googleConsentModeSnippet(option === true ? {} : option);
}

/**
 * @internal The tags the handle adds to the head: the Consent Mode default when asked for, the
 * critical CSS, and the full stylesheet fetched without blocking first paint (the runtime
 * switches it to `media="all"` once mounted).
 *
 * The `<style>` never carries a nonce: it is admitted by `CRITICAL_CSS_HASH`, because SvelteKit
 * puts no nonce in `style-src`. Only the `<script>` takes one, the one SvelteKit already put on its
 * own scripts, which its `script-src` admits.
 */
export function _headMarkup(
  consentModeText: string | undefined,
  href: string,
  nonce: string | undefined,
): string {
  const script = consentModeText
    ? `<script${nonce ? ` nonce="${escapeAttribute(nonce)}"` : ""}>${consentModeText}</script>`
    : "";
  return `${script}<style>${CRITICAL_CSS}</style><link rel="stylesheet" href="${escapeAttribute(href)}" media="print" data-cy-full>`;
}

/**
 * @internal The nonce SvelteKit put on its own `<script>` tags, which exist only when `kit.csp`
 * needs one. SvelteKit builds the page from its template before `transformPageChunk` runs, so
 * `%sveltekit.nonce%` written by the handle would stay literal; copying the value it already
 * wrote is the only way to give our script the same nonce. Undefined when the page has none,
 * and then our script carries no nonce attribute.
 */
export function _readNonce(html: string): string | undefined {
  return /<script\b[^>]*\snonce="([^"]*)"/i.exec(html)?.[1] || undefined;
}

const CHARSET = /<meta charset[^>]*>/i;
const HEAD_OPEN = /<head(?:\s[^>]*)?>/i;

/** @internal Whether `html` holds a tag the markup can be placed after. */
export function _hasHeadAnchor(html: string): boolean {
  return CHARSET.test(html) || HEAD_OPEN.test(html);
}

/**
 * @internal Puts the markup right after the page's `<meta charset>`, ahead of every other tag so
 * the Consent Mode default runs before any Google tag. Not before the charset: about 7 KB of
 * critical CSS would push it past the first 1024 bytes, where a browser stops looking for it, and
 * a static host that sends no charset header would then decode the banner's translations wrongly.
 * Without a charset tag it goes after `<head>`, and without that at the start.
 */
export function _insertHead(html: string, markup: string): string {
  const match = CHARSET.exec(html) ?? HEAD_OPEN.exec(html);
  if (!match) return markup + html;
  const end = match.index + match[0].length;
  return html.slice(0, end) + markup + html.slice(end);
}

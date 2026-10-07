/**
 * The before-paint check for the announcement strip, as the inline script the root layout
 * puts in <head>. Plain JavaScript so its test runs the exact string that ships, on every
 * Node version CI uses, without a build step.
 *
 * The strip is in the prerendered HTML for every visitor; this script hides it by setting
 * `data-cy-ann="off"` on <html> before the body is parsed, so a strip that should not show
 * never paints. Deciding later, in React, would show it and then pull it away.
 */

/** localStorage key that records one dismissed announcement. Per id, never a global flag. */
export const DISMISS_KEY_PREFIX = "cy-banner:";

/**
 * The script for one announcement.
 *
 * Hidden when it has expired, on the playground preview (the iframe that shows the SDK's
 * own demo banner), when this id was dismissed, and while the site's consent banner still
 * waits for the visitor's choice: consent comes first, and the strip appears from the next
 * page load after it, so nothing moves on screen. Being on the linked page counts as
 * dismissing it, because the visitor has done what it asked.
 *
 * Storage and cookie reads each sit in their own try: a browser that blocks storage still
 * gets the consent check, and still sees the strip (dismissable for that visit only).
 */
export function announcementGateScript({ id, expiresAt, linkPath, skipPath, waitForConsent }) {
  const gate = {
    key: DISMISS_KEY_PREFIX + id,
    expiresAt,
    linkPath,
    skipPath,
    waitForConsent,
  };
  return `(function (g) {
  var root = document.documentElement;
  function hide() { root.setAttribute("data-cy-ann", "off"); }
  var path = location.pathname.replace(/\\/+$/, "") || "/";
  if (Date.now() >= g.expiresAt || path.indexOf(g.skipPath) === 0) return hide();
  if (path === g.linkPath) {
    try { localStorage.setItem(g.key, "dismissed"); } catch (e) {}
    return hide();
  }
  try { if (localStorage.getItem(g.key) === "dismissed") return hide(); } catch (e) {}
  if (g.waitForConsent && !/(?:^|;\\s*)cookieyes-consent=[^;]*\\baction:yes\\b/.test(document.cookie)) hide();
})(${JSON.stringify(gate)});`;
}

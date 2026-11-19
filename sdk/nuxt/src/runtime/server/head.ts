import { defineNitroPlugin, useRuntimeConfig } from "#imports";

type HeadConfig = { markup: string; stylesPath: string };

function escapeAttribute(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

/**
 * @internal The module's head markup with the stylesheet link, under the run-time base URL: the
 * handler that serves the stylesheet is mounted under it, and NUXT_APP_BASE_URL can change it
 * after the build.
 */
export function _headMarkup(head: HeadConfig, baseURL: string): string {
  const href = escapeAttribute(`${baseURL.replace(/\/$/, "")}${head.stylesPath}`);
  // Fetched without blocking first paint; the runtime switches it to `media="all"` once mounted.
  return `${head.markup}<link rel="stylesheet" href="${href}" media="print" data-cy-full>`;
}

/**
 * @internal Puts the markup right after the page's `<meta charset>`, ahead of every other tag so
 * the Consent Mode default runs before any Google tag. Not before the charset: about 7 KB of
 * critical CSS would push it past the first 1024 bytes, where a browser stops looking for it, and
 * a static host that sends no charset header would then decode the banner's translations wrongly.
 */
export function _insertHead(head: string[], markup: string): void {
  for (let i = 0; i < head.length; i++) {
    const chunk = head[i] as string;
    const match = /<meta charset[^>]*>/i.exec(chunk);
    if (!match) continue;
    const end = match.index + match[0].length;
    head[i] = chunk.slice(0, end) + markup + chunk.slice(end);
    return;
  }
  head.unshift(markup);
}

/** Writes the module's head tags into every rendered page. Built once per server start. */
export default defineNitroPlugin((nitroApp) => {
  const config = useRuntimeConfig() as { cookieyesHead?: HeadConfig; app?: { baseURL?: string } };
  if (!config.cookieyesHead) return;
  const markup = _headMarkup(config.cookieyesHead, config.app?.baseURL ?? "/");
  nitroApp.hooks.hook("render:html", (html) => {
    _insertHead(html.head, markup);
  });
});

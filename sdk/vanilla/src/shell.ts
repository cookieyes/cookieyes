import { _normalizeConfig, type CookieYesConfig, resolveTranslations } from "@cookieyes/core";
import { banner, bannerAnnouncer, renderToString, type UiNode } from "@cookieyes/ui";

function marked(node: UiNode): UiNode {
  return { ...node, attrs: { ...node.attrs, "data-cy-shell": "" } };
}

/**
 * The banner as HTML, for a page to include before any script runs: paste it
 * at the start of `<body>`, with `critical.css` in `<head>`, and the banner is
 * on screen at first paint. When `start` runs it takes the banner over in the
 * same task, without a flash or a second entry animation.
 *
 * The text is the starting language of `config.i18n`, and the banner is the
 * configured `regulation`'s: a static page cannot know a visitor's region.
 * Works on a server or at build time, with no browser.
 *
 * @example renderShell({ mode: "cookie-only", regulation: "GDPR" })
 */
export function renderShell(config: CookieYesConfig): string {
  const options = _normalizeConfig(config);
  return renderToString([
    marked(bannerAnnouncer()),
    marked(
      banner({
        translations: resolveTranslations(options.i18n),
        regulation: options.regulation ?? "DEFAULT",
        titleId: "cy-shell-title",
      }),
    ),
  ]);
}

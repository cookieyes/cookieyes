import {
  _normalizeConfig,
  type CookieYesConfig,
  readServerConsent,
  resolveTranslations,
} from "@cookieyes/core";
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
 * On a server, pass the request's `Cookie` header: for a visitor who has
 * already decided it returns an empty string, so their page never shows the
 * banner at all. A static page cannot do this, and shows the banner until
 * `start` removes it.
 *
 * @example renderShell(config, { cookieHeader: request.headers.get("cookie") ?? "" })
 */
export function renderShell(
  config: CookieYesConfig,
  request?: { cookieHeader?: string | undefined },
): string {
  const options = _normalizeConfig(config);
  if (request?.cookieHeader) {
    const decided = readServerConsent(request.cookieHeader, {
      regulation: options.regulation,
      categories: options.categories,
    });
    if (decided) return "";
  }
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

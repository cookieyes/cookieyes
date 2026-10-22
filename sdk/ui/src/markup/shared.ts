import type { TranslationMap } from "@cookieyes/core";
import { cookieYesLogo } from "./icons.js";
import type { UiChild, UiNode } from "./node.js";
import { splitPoweredBy } from "./powered-by.js";

// Helpers for the component markup. Each component lives in its own module, so
// an adapter can load a dialog's markup only when the dialog first opens.

export function el(
  tag: string,
  attrs: Record<string, string | undefined>,
  children: UiChild[] = [],
): UiNode {
  const clean: Record<string, string> = {};
  for (const [name, value] of Object.entries(attrs)) if (value !== undefined) clean[name] = value;
  return { tag, attrs: clean, children };
}

/** The "Powered by CookieYes" link in the banner and both dialogs. */
export function branding(t: TranslationMap, part: string): UiNode {
  const [before, after] = splitPoweredBy(t.poweredBy);
  return el(
    "a",
    {
      href: "https://www.cookieyes.com",
      target: "_blank",
      rel: "noopener noreferrer",
      "aria-label": `${t.poweredBy} (${t.opensInNewTab})`,
      class: "cy-branding",
      "data-cy-part": part,
    },
    [before, cookieYesLogo(), after].filter((c) => c !== ""),
  );
}

export function button(attrs: Record<string, string | undefined>, children: UiChild[]): UiNode {
  return el("button", { type: "button", ...attrs }, children);
}

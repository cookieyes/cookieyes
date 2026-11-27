import {
  _categoryLabel,
  type CookieYesConfig,
  resolveCategories,
  resolveTranslations,
} from "@cookieyes/core";
import { banner, bannerAnnouncer, renderToString, type UiNode } from "@cookieyes/ui";
import type { _RequestRegion } from "./config.js";
import { type _ClassNames, _decorate, type _PageClassNames, type _Surface } from "./decorate.js";
import { _canBeCcpa, type CookieYesLocals } from "./server-consent.js";

// The server half of the components. The `.astro` files only pass `Astro.locals` and their props
// here, so the logic is in TypeScript the tests cover, and every component renders `@cookieyes/ui`'s
// markup through its `renderToString`, which is what React's presets are pinned to.

/** @internal What the browser reads from the page: `#cookieyes-page`. */
export type _PageData = {
  surfaces: _Surface[];
  classNames: _PageClassNames;
  request: _RequestRegion;
};

type PageState = {
  config: CookieYesConfig;
  roots: number;
  surfaces: Set<_Surface>;
  classNames: _PageClassNames;
};

// Keyed by the request's `locals` object, which every component of one page render shares, and
// collected with it: nothing about one visitor outlives their request.
const pages = new WeakMap<object, PageState>();

/** @internal Called by the middleware: the config every component of this request renders from. */
export function _setPageConfig(locals: object, config: CookieYesConfig): void {
  pages.set(locals, { config, roots: 0, surfaces: new Set(), classNames: {} });
}

let warnedMissing = false;

function stateOf(locals: object): PageState | undefined {
  const state = pages.get(locals);
  if (!state && !warnedMissing) {
    warnedMissing = true;
    console.warn("[cookieyes] Add cookieyes() to integrations in astro.config.mjs.");
  }
  return state;
}

/** @internal Lets a test see the missing-integration message again. */
export function _resetWarnings(): void {
  warnedMissing = false;
}

function marked(node: UiNode, wait: boolean): UiNode {
  const attrs: Record<string, string> = { ...node.attrs, "data-cy-shell": "" };
  if (wait) attrs["data-cy-wait"] = "";
  return { ...node, attrs };
}

/**
 * The banner as the server draws it, which `@cookieyes/vanilla`'s widget takes over in the same
 * task it starts: the shell of its `renderShell`. A visitor the server read as decided gets none.
 * A page shared by every visitor gets one marked `data-cy-wait`, which stays hidden until the
 * head script has read the cookie, so a returning visitor never sees it.
 */
function bannerShell(state: PageState, locals: CookieYesLocals): string {
  if (locals.read && locals.initialConsent) return "";
  const wait = !locals.read;
  const node = banner({
    translations: resolveTranslations(state.config.i18n),
    regulation: locals.regulation,
    titleId: "cy-shell-title",
  });
  return renderToString([
    marked(bannerAnnouncer(), false),
    marked(_decorate("banner", node, state.classNames), wait),
  ]);
}

/** Props every surface component takes. */
type SurfaceProps = { class?: string | undefined; classNames?: _ClassNames | undefined };

function register(state: PageState, surface: _Surface, props: SurfaceProps): void {
  state.surfaces.add(surface);
  const classNames: _ClassNames = { ...props.classNames };
  if (props.class) classNames.root = [props.class, classNames.root].filter(Boolean).join(" ");
  if (Object.keys(classNames).length > 0) state.classNames[surface] = classNames;
}

const COMPONENT: Record<_Surface, string> = {
  banner: "CookieBanner",
  preferences: "CookiePreferences",
  optOut: "CookieOptOut",
  recall: "RecallButton",
  reloadNotice: "ReloadNotice",
};

/**
 * @internal `<CookieBanner />`, `<CookiePreferences />`, `<CookieOptOut />`, `<RecallButton />`
 * and `<ReloadNotice />`. Each records itself for the browser's widget. Only the banner has
 * server markup: the dialogs, the recall button and the notice draw nothing until the browser
 * opens them, which is what React renders while they are closed. The marker lets the browser name
 * a component placed outside `<CookieYesRoot />`.
 */
export function _renderSurface(
  locals: object,
  surface: _Surface,
  props: SurfaceProps = {},
): string {
  const state = stateOf(locals);
  if (!state) return "";
  register(state, surface, props);
  const marker = `<template data-cy-surface="${COMPONENT[surface]}"></template>`;
  if (surface !== "banner") return marker;
  return marker + bannerShell(state, (locals as { cookieyes: CookieYesLocals }).cookieyes);
}

/**
 * @internal `<CookieYesRoot />`: the banner, the preferences dialog, the recall button and, when
 * CCPA can apply, the opt-out dialog, inside the element `@cookieyes/vanilla` draws into, which
 * the client router carries across navigations. `slot` is the default slot, whose components
 * replace that set. The page data for the browser follows the element.
 */
export async function _renderRoot(
  locals: object,
  slot: (() => Promise<string>) | undefined,
): Promise<string> {
  const state = stateOf(locals);
  if (!state) return "";
  state.roots += 1;
  if (state.roots > 1) {
    console.warn("[cookieyes] Two <CookieYesRoot /> on this page; the first is used.");
    return "";
  }
  let inner: string;
  if (slot) {
    inner = await slot();
  } else {
    inner = _renderSurface(locals, "banner");
    for (const surface of ["preferences", "recall"] as const) _renderSurface(locals, surface);
    if (_canBeCcpa(state.config)) _renderSurface(locals, "optOut");
  }
  const { read, region, forcedRegion } = (locals as { cookieyes: CookieYesLocals }).cookieyes;
  const data: _PageData = {
    surfaces: [...state.surfaces],
    classNames: state.classNames,
    // `forcedRegion` is set only where the server honoured it: in development.
    request: { read, region, ...(forcedRegion ? { forcedRegion } : {}) },
  };
  // `<` is escaped so no value can close the script element early.
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  return (
    `<div id="cookieyes-portal-root" data-astro-transition-persist="cookieyes">${inner}</div>` +
    `<script type="application/json" id="cookieyes-page">${json}</script>`
  );
}

/** @internal `<GatedScript />`: a marker the browser registers with core, which loads it on grant. */
export function _renderGatedScript(
  locals: object,
  props: { id: string; src: string; category: string },
): string {
  if (!stateOf(locals)) return "";
  return renderToString({
    tag: "template",
    attrs: {
      "data-cy-gated-script": "",
      "data-id": props.id,
      "data-src": props.src,
      "data-category": props.category,
    },
  });
}

/**
 * @internal `<GatedFrame />`: the placeholder, never the iframe, as React's `GatedFrame` renders
 * during SSR: consent is per visitor and a shared server must not decide it. The iframe's
 * attributes travel as JSON for the browser to build it once the category is granted.
 * `placeholder` is the named slot's HTML, which replaces the default text and button.
 */
export function _renderGatedFrame(
  locals: object,
  props: Record<string, unknown> & { src: string; category: string },
  placeholder: string | undefined,
): string {
  const state = stateOf(locals);
  if (!state) return "";
  const { src, category, ...rest } = props;
  const attrs: Record<string, string> = {};
  for (const [name, value] of Object.entries(rest)) {
    if (value === true) attrs[name] = "";
    else if (typeof value === "string" || typeof value === "number") attrs[name] = String(value);
  }
  const shell = renderToString({
    tag: "div",
    attrs: {
      class: "cy-frame-placeholder",
      "data-cy-gated-frame": "",
      "data-category": category,
      "data-frame": JSON.stringify({ src, attrs }),
    },
    children: placeholder === undefined ? defaultPlaceholder(state.config, category) : [],
  });
  if (placeholder === undefined) return shell;
  return `${shell.slice(0, -"</div>".length)}${placeholder}</div>`;
}

function defaultPlaceholder(config: CookieYesConfig, category: string): UiNode[] {
  const t = resolveTranslations(config.i18n);
  const label = _categoryLabel(category, t, resolveCategories(config.categories), undefined);
  const [before = "", after = ""] = t.gatedFrame.placeholder.split("{category}");
  return [
    { tag: "p", children: [before, { tag: "strong", children: [label] }, after] },
    {
      tag: "button",
      attrs: { class: "cy-btn cy-btn-primary", type: "button", "data-cy-gated-open": "" },
      children: [t.gatedFrame.action],
    },
  ];
}

import {
  type ConsentCategory,
  type ConsentEventListener,
  type ConsentEventOptions,
  type ConsentEventType,
  type ConsentRuntime,
  type ConsentSource,
  type ConsentStoreState,
  type CookieYesConfig,
  resolveCategories,
} from "@cookieyes/core";
import { _mountWidget } from "@cookieyes/vanilla";
import { _mergeConfig, _withRequestRegion } from "../config.js";
import { _decorate, type _Surface } from "../decorate.js";
import type { _PageData } from "../markup.js";
import { _scanGated } from "./gated.js";
import { _installRouter } from "./router.js";

// The browser half of `@cookieyes/astro`. The page entry the integration generates calls `_boot`
// once per visit; every other function here may run before that, from an island that hydrated
// first, and waits for the runtime instead of failing.

/** The same actions as `useConsentActions()` in the React, Vue and Svelte packages. */
export type ConsentActions = {
  acceptAll: () => void;
  rejectAll: () => void;
  acceptSelected: (categories: ConsentCategory[]) => void;
  save: () => void;
  updateCategory: (category: ConsentCategory, value: boolean) => void;
  reset: () => void;
  showPreferences: () => void;
  hidePreferences: () => void;
  showOptOut: () => void;
  hideOptOut: () => void;
  /** Close the banner without a decision; nothing is saved. */
  dismissBanner: () => void;
};

type Widget = ReturnType<typeof _mountWidget>;

let started: ((widget: Widget) => void) | undefined;
const ready = new Promise<Widget>((resolve) => {
  started = resolve;
});
let booted = false;
let widget: Widget | undefined;

function whenStarted(run: (widget: Widget) => void): void {
  if (widget) run(widget);
  else void ready.then(run);
}

function readPage(): _PageData | null {
  const el = document.getElementById("cookieyes-page");
  if (!el?.textContent) return null;
  return JSON.parse(el.textContent) as _PageData;
}

function warnMissingRoot(): void {
  if (!import.meta.env.DEV) return;
  const orphan = document.querySelector("template[data-cy-surface]");
  const name = orphan ? `<${orphan.getAttribute("data-cy-surface")} />` : "@cookieyes/astro";
  console.warn(`[cookieyes] ${name} needs <CookieYesRoot /> in your layout.`);
}

/**
 * In development, says so once when the preferences dialog opens (from the banner's Customise
 * button, a `<GatedFrame />` placeholder or `openPreferences()`) on a page whose root does not
 * draw it, which a default slot without `<CookiePreferences />` causes: the banner steps aside
 * and nothing takes its place. The same kind of message as a missing root.
 */
function warnOnMissingPreferences(runtime: ConsentRuntime, surfaces: _Surface[]): void {
  if (surfaces.includes("preferences")) return;
  let warned = false;
  runtime.consentStore.subscribe(() => {
    if (warned || !runtime.consentManager.isPreferencesOpen) return;
    warned = true;
    console.warn(
      "[cookieyes] The preferences dialog was opened, but <CookiePreferences /> is not in " +
        "<CookieYesRoot /> on this page.",
    );
  });
}

/**
 * @internal Called by the generated page entry only. Starts the banner once per visit, from the
 * JSON options of astro.config.mjs merged with the default export of `src/cookieyes.client.ts`.
 * Under `<ClientRouter />` the entry runs once and the runtime lives across navigations; a page
 * without `<CookieYesRoot />` starts nothing and says so in development.
 */
export function _boot(config: CookieYesConfig, client: Partial<CookieYesConfig>): void {
  if (booted) return;
  booted = true;
  const merged = _mergeConfig(config, client);
  if (
    import.meta.env.DEV &&
    resolveCategories(config.categories).taxonomyHash !==
      resolveCategories(merged.categories).taxonomyHash
  ) {
    console.warn(
      "[cookieyes] `categories` differ between astro.config.mjs and src/cookieyes.client.ts. " +
        "Move them to astro.config.mjs, where the head script that decides first paint sees them.",
    );
  }

  const start = (): void => {
    if (widget) {
      if (!readPage()) warnMissingRoot();
      _scanGated(widget.runtime, merged, widget.openPreferences);
      return;
    }
    const page = readPage();
    if (!page) {
      warnMissingRoot();
      return;
    }
    // The opt-out dialog is always available, whatever the server saw: CCPA may be configured only
    // in `cookieyes.client.ts`, and without it Do Not Sell would remove the banner and show
    // nothing. It is loaded on first open, so it costs nothing until then.
    const surfaces = page.surfaces.includes("optOut")
      ? page.surfaces
      : [...page.surfaces, "optOut" as const];
    widget = _mountWidget(_withRequestRegion(merged, page.request), {
      surfaces,
      decorate: (surface, node) => _decorate(surface, node, page.classNames),
    });
    if (import.meta.env.DEV) warnOnMissingPreferences(widget.runtime, surfaces);
    _scanGated(widget.runtime, merged, widget.openPreferences);
    started?.(widget);
  };
  _installRouter(start);
  start();
}

/**
 * The consent runtime, once it has started. A promise, unlike `getCookieYes()` in the other
 * packages, because an island can hydrate before the page entry runs.
 *
 * @example const runtime = await getCookieYes();
 */
export async function getCookieYes(): Promise<ConsentRuntime> {
  return (await ready).runtime;
}

/** The current consent state: committed and live values, regulation and the active surface. */
export async function getConsent(): Promise<ConsentStoreState> {
  return (await getCookieYes()).consentStore.getState();
}

/**
 * Whether `category` is committed-granted: a saved decision, not an unsaved toggle in the
 * preferences dialog. Use it for gating.
 *
 * @example if (await getConsentCategory("analytics")) loadAnalytics();
 */
export async function getConsentCategory(category: ConsentCategory): Promise<boolean> {
  return (await getConsent()).committedConsents[category] === true;
}

/**
 * Listens to consent decisions, as `consentStore.on` does: `"save"` on every save, `"change"` only
 * when a category differs. The listener also fires once with the current state when the runtime
 * starts. The returned function unsubscribes, also before the runtime has started.
 *
 * @example onConsentChange("change", ({ categories }) => { if (categories.analytics) load(); });
 */
export function onConsentChange(
  type: ConsentEventType,
  listener: ConsentEventListener,
  options?: ConsentEventOptions,
): () => void {
  let stopped = false;
  let off: (() => void) | undefined;
  whenStarted((w) => {
    if (!stopped) off = w.runtime.consentStore.on(type, listener, options);
  });
  return () => {
    stopped = true;
    off?.();
  };
}

/**
 * Actions for driving consent from your own UI. Calls made before the runtime starts run when it
 * does. `source` records where your UI is (`"banner"`, `"preferences"`, `"optout"`); omitted,
 * decisions are recorded as `"api"`.
 */
export function getConsentActions(source?: ConsentSource): ConsentActions {
  const manager = (run: (m: ConsentRuntime["consentManager"]) => void) => () =>
    whenStarted((w) => run(w.runtime.consentManager));
  return {
    acceptAll: manager((m) => m.acceptAll(source)),
    rejectAll: manager((m) => m.rejectAll(source)),
    acceptSelected: (categories) =>
      whenStarted((w) => w.runtime.consentManager.acceptSelected(categories, source)),
    save: manager((m) => m.savePreferences(source)),
    updateCategory: (category, value) =>
      whenStarted((w) => w.runtime.consentManager.updateCategory(category, value)),
    reset: manager((m) => m.resetConsent()),
    showPreferences: openPreferences,
    hidePreferences: manager((m) => m.hidePreferences()),
    showOptOut: openOptOut,
    hideOptOut: () => whenStarted((w) => w.closeOptOut()),
    dismissBanner: manager((m) => m.dismissBanner()),
  };
}

/**
 * Opens the preferences dialog, for a "Cookie settings" link of your own. Focus returns to the
 * link when the dialog closes.
 */
export function openPreferences(): void {
  whenStarted((w) => w.openPreferences());
}

/** Opens the CCPA opt-out dialog, for a "Do Not Sell" link of your own. */
export function openOptOut(): void {
  whenStarted((w) => w.openOptOut());
}

export type {
  ConsentCategory,
  ConsentEventListener,
  ConsentEventOptions,
  ConsentEventType,
  ConsentRuntime,
  ConsentSource,
  ConsentStoreState,
  CookieYesConfig,
} from "@cookieyes/core";
/**
 * Re-exported from `@cookieyes/core` for a tool that keeps running after its category is
 * withdrawn. Register it in `src/cookieyes.client.ts`, whose module runs before the runtime starts.
 */
export {
  type AnyStopHandler,
  type ReloadOnlyHandler,
  registerStopHandler,
  type StopHandler,
} from "@cookieyes/core";
/**
 * Re-exported from `@cookieyes/core/iframes` so a site can block embeds in HTML it does not render
 * itself (CMS or Markdown content): `blockIframes(runtime.consentManager, runtime.consentStore)`
 * with `runtime` from `getCookieYes()`. A separate core entry, so the page entry, which never calls
 * it, leaves it out of the bundle.
 */
export { blockIframes, type IframeBlockerStore } from "@cookieyes/core/iframes";

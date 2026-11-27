import {
  _categoryLabel,
  _warnUnknownEmbedCategory,
  type ConsentRuntime,
  type CookieYesConfig,
} from "@cookieyes/core";
import { applyTheme } from "@cookieyes/ui";

const seen = new WeakSet<Element>();
/** Frames on the page and how to stop following consent, dropped once they leave the page. */
const frames = new Map<Element, { current: () => Element; stop: () => void }>();

function wireFrame(
  placeholder: HTMLElement,
  runtime: ConsentRuntime,
  config: CookieYesConfig,
  openPreferences: () => void,
): void {
  const category = placeholder.getAttribute("data-category") ?? "";
  const { src, attrs } = JSON.parse(placeholder.getAttribute("data-frame") ?? "{}") as {
    src: string;
    attrs: Record<string, string>;
  };
  if (!runtime.consentStore.categories.ids.includes(category)) {
    _warnUnknownEmbedCategory(category);
  }
  // The default text names the category as the browser's runtime knows it, which can include a
  // label set only in `cookieyes.client.ts`.
  const strong = placeholder.querySelector("p > strong");
  if (strong) {
    strong.textContent = _categoryLabel(
      category,
      runtime.consentStore.translations,
      runtime.consentStore.categories,
      runtime.consentStore.getCategoryText(category),
    );
  }
  placeholder.querySelector("[data-cy-gated-open]")?.addEventListener("click", openPreferences);
  const dark = globalThis.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
  applyTheme(placeholder, config.theme, config.colorScheme ?? "system", dark);

  let frame: HTMLIFrameElement | undefined;
  // Follows the saved choice in both directions, as React's `GatedFrame` does: withdrawing the
  // category swaps the iframe back to the placeholder, which unloads the embed at once.
  const stop = runtime.consentStore.on(
    "change",
    ({ categories }) => {
      if (categories[category] === true && !frame) {
        frame = document.createElement("iframe");
        for (const [name, value] of Object.entries(attrs)) {
          // Through the CSSOM, which a strict `style-src` allows; a `style` attribute it blocks.
          if (name === "style") frame.style.cssText = value;
          else frame.setAttribute(name, value);
        }
        frame.src = src;
        placeholder.replaceWith(frame);
      } else if (categories[category] !== true && frame) {
        frame.replaceWith(placeholder);
        frame = undefined;
      }
    },
    { category },
  );
  frames.set(placeholder, { current: () => frame ?? placeholder, stop });
}

/**
 * @internal Wires every `<GatedScript />` and `<GatedFrame />` on the page that is not wired yet.
 * Runs when the runtime starts and after each client-router navigation; markers already seen are
 * skipped, so running it twice is harmless. A script is registered with core, which keys its
 * registry by id and loads it once its category is committed-granted, as React's `GatedScript`
 * does; it is never unregistered.
 */
export function _scanGated(
  runtime: ConsentRuntime,
  config: CookieYesConfig,
  openPreferences: () => void,
): void {
  for (const [placeholder, frame] of frames) {
    if (frame.current().isConnected) continue;
    frame.stop();
    frames.delete(placeholder);
  }
  for (const el of document.querySelectorAll("template[data-cy-gated-script]")) {
    if (seen.has(el)) continue;
    seen.add(el);
    runtime.consentManager.registerScript({
      id: el.getAttribute("data-id") ?? "",
      src: el.getAttribute("data-src") ?? "",
      category: el.getAttribute("data-category") ?? "",
    });
  }
  for (const el of document.querySelectorAll<HTMLElement>("[data-cy-gated-frame]")) {
    if (seen.has(el)) continue;
    seen.add(el);
    wireFrame(el, runtime, config, openPreferences);
  }
}

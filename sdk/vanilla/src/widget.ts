import {
  type ConsentRuntime,
  type CookieYesConfig,
  initCookieYes,
  resetConsentRuntime,
} from "@cookieyes/core";
import {
  activateDeferredStylesheets,
  announceBanner,
  applyTheme,
  banner,
  bannerAnnouncer,
  bodyPortalRoot,
  focusRecallAfterBanner,
  isBannerVisible,
  isRecallVisible,
  loadThemeRuntime,
  recallButton,
  reloadNotice,
  rememberOpener,
  renderToDom,
  trapFocus,
  type UiNode,
  warnOnStyleCspViolations,
  watchPrefersDark,
} from "@cookieyes/ui";
import type { DialogContext, Dialogs } from "./dialogs.js";
import { morph } from "./morph.js";

/**
 * Declared locally rather than taken from `@types/node`, so the literal
 * `process.env.NODE_ENV` survives into the published output for a consumer's
 * bundler to replace; see `@cookieyes/core`'s `deprecations.ts`.
 */
declare const process: { env: { NODE_ENV?: string } };

/** An element this package put on the page, and what undoes its behaviour. */
type Surface = { el: HTMLElement; undo: Array<() => void> };

function remove(surface: Surface | undefined): void {
  if (!surface) return;
  for (const undo of surface.undo) undo();
  surface.el.remove();
}

/** The part a click landed on, read from the nearest `data-cy-part`. */
function partOf(e: Event): string | null {
  return (
    (e.target as Element | null)?.closest("[data-cy-part]")?.getAttribute("data-cy-part") ?? null
  );
}

let sequence = 0;
/** An id unique on the page, so two widgets never label each other's elements. */
function newId(name: string): string {
  sequence += 1;
  return `cy-${name}-${sequence}`;
}

/** What `start` hands back to the module: the commands, and the cleanup. */
export type Widget = {
  runtime: ConsentRuntime;
  openPreferences: () => void;
  openOptOut: () => void;
  destroy: () => void;
};

/**
 * Starts the SDK with `config` and draws every component from
 * `@cookieyes/ui`'s markup, attaching `ui`'s behaviour to the real elements.
 * Consent decisions are core's; the only state kept here is the UI's own:
 * whether the opt-out dialog is open.
 */
export function mountWidget(config: CookieYesConfig): Widget {
  const runtime = initCookieYes(config);
  const manager = runtime.consentManager;
  const store = runtime.consentStore;
  const colorScheme = config.colorScheme ?? "system";
  const undoAll: Array<() => void> = [];

  // Developer diagnostics only; the literal check lets a production build drop them.
  if (process.env.NODE_ENV !== "production") undoAll.push(warnOnStyleCspViolations());
  // Start fetching the theme code now, so it overlaps the first render.
  if (config.theme) void loadThemeRuntime();
  activateDeferredStylesheets();

  let destroyed = false;
  let optOutOpen = false;
  let prefersDark = false;
  let bannerSurface: Surface | undefined;
  let recallSurface: Surface | undefined;
  let noticeSurface: Surface | undefined;
  let announcer: HTMLElement | undefined;
  let announced: string | null = null;
  let cancelAnnouncement: (() => void) | undefined;
  let dialogs: Dialogs | undefined;
  let dialogsLoading = false;
  const bannerTitleId = newId("banner-title");

  const themeUndo = new Map<HTMLElement, () => void>();
  function themed(el: HTMLElement): () => void {
    themeUndo.set(el, applyTheme(el, config.theme, colorScheme, prefersDark));
    return () => {
      themeUndo.get(el)?.();
      themeUndo.delete(el);
    };
  }
  if (colorScheme === "system") {
    undoAll.push(
      watchPrefersDark((dark) => {
        prefersDark = dark;
        for (const el of [...themeUndo.keys()]) {
          themeUndo.get(el)?.();
          themeUndo.set(el, applyTheme(el, config.theme, colorScheme, prefersDark));
        }
      }),
    );
  }

  function openPreferences(): void {
    rememberOpener();
    manager.showPreferences();
  }
  function openOptOut(): void {
    if (optOutOpen) return;
    rememberOpener();
    optOutOpen = true;
    render();
  }
  function closeOptOut(): void {
    if (!optOutOpen) return;
    optOutOpen = false;
    render();
  }

  /** Creates `markup` the first time, and updates it in place after that. */
  function draw(
    surface: Surface | undefined,
    markup: UiNode,
    place: (el: HTMLElement) => void,
    wire: (el: HTMLElement) => Array<() => void>,
  ): Surface {
    if (surface) {
      morph(surface.el, markup);
      return surface;
    }
    const el = renderToDom(markup) as HTMLElement;
    place(el);
    return { el, undo: [...wire(el), themed(el)] };
  }

  function onBannerClick(e: Event): void {
    switch (partOf(e)) {
      case "accept-all":
        manager.acceptAll("banner");
        break;
      case "reject-all":
        manager.rejectAll("banner");
        break;
      case "customise":
        openPreferences();
        break;
      case "do-not-sell":
        openOptOut();
        break;
      case "close":
        manager.dismissBanner();
        break;
    }
  }

  function onNoticeClick(e: Event): void {
    const part = partOf(e);
    if (part === "reload") window.location.reload();
    else if (part === "reload-dismiss") manager.dismissReloadNotice();
  }

  function render(): void {
    if (destroyed) return;
    const t = store.translations;
    const regulation = manager.regulation;
    const state = {
      hasActed: manager.hasActed,
      isBannerDismissed: manager.isBannerDismissed,
      isPreferencesOpen: manager.isPreferencesOpen,
      isOptOutOpen: optOutOpen,
    };
    const root = bodyPortalRoot();

    if (!announcer) {
      announcer = renderToDom(bannerAnnouncer()) as HTMLElement;
      root.prepend(announcer);
    }
    const live = announcer;

    let bannerHid = false;
    if (isBannerVisible(state)) {
      // A banner already on the page from the first-paint snippet is replaced
      // in the same task, before the browser paints, and marked so it does not
      // play its entry animation a second time.
      const shell = bannerSurface ? null : findShell();
      bannerSurface = draw(
        bannerSurface,
        banner({ translations: t, regulation, titleId: bannerTitleId }),
        (el) => {
          if (shell) el.setAttribute("data-cy-entered", "");
          live.after(el);
          removeShell(shell);
        },
        (el) => {
          el.addEventListener("click", onBannerClick);
          return [
            () => el.removeEventListener("click", onBannerClick),
            trapFocus(() => el.querySelector<HTMLElement>("[data-cky-banner]")),
          ];
        },
      );
      if (announced !== t.bannerTitle) {
        cancelAnnouncement?.();
        announced = t.bannerTitle;
        cancelAnnouncement = announceBanner(t.bannerTitle, (text) => {
          live.textContent = text;
        });
      }
    } else {
      removeShell(findShell());
      if (bannerSurface) {
        remove(bannerSurface);
        bannerSurface = undefined;
        bannerHid = true;
        cancelAnnouncement?.();
        announced = null;
        live.textContent = "";
      }
    }

    if (isRecallVisible(state, regulation)) {
      recallSurface = draw(
        recallSurface,
        recallButton(t),
        (el) => root.appendChild(el),
        (el) => {
          const onClick = () => (regulation === "CCPA" ? openOptOut() : openPreferences());
          el.addEventListener("click", onClick);
          return [() => el.removeEventListener("click", onClick)];
        },
      );
    } else {
      remove(recallSurface);
      recallSurface = undefined;
    }
    // After the recall button is back, so focus has somewhere to go.
    if (bannerHid) focusRecallAfterBanner();

    if (manager.reloadNotice.required) {
      noticeSurface = draw(
        noticeSurface,
        reloadNotice(t),
        (el) => document.body.appendChild(el),
        (el) => {
          el.addEventListener("click", onNoticeClick);
          return [() => el.removeEventListener("click", onNoticeClick)];
        },
      );
    } else {
      remove(noticeSurface);
      noticeSurface = undefined;
    }

    // Last, so a closing dialog hands focus back to a banner or recall button
    // that is already on the page.
    if (dialogs) dialogs.render();
    else if ((state.isPreferencesOpen || optOutOpen) && !dialogsLoading) loadDialogs();
  }

  function loadDialogs(): void {
    dialogsLoading = true;
    const context: DialogContext = {
      runtime,
      themed,
      newId,
      isOptOutOpen: () => optOutOpen,
      closeOptOut,
    };
    // Loaded on first use: a visitor who never opens a dialog never downloads it.
    void import("./dialogs.js").then(({ createDialogs }) => {
      if (destroyed) return;
      dialogs = createDialogs(context);
      render();
    });
  }

  const unsubscribe = store.subscribe(() => render());
  render();

  return {
    runtime,
    openPreferences,
    openOptOut,
    destroy() {
      destroyed = true;
      unsubscribe();
      cancelAnnouncement?.();
      dialogs?.destroy();
      remove(bannerSurface);
      remove(recallSurface);
      remove(noticeSurface);
      announcer?.remove();
      for (const undo of undoAll) undo();
      const root = document.getElementById("cookieyes-portal-root");
      if (root && root.childNodes.length === 0) root.remove();
      resetConsentRuntime();
    },
  };
}

/** A banner shell from the first-paint snippet, if the page has one. */
function findShell(): HTMLElement | null {
  return document.querySelector<HTMLElement>(".cy-banner-wrap[data-cy-shell]");
}

function removeShell(shell: HTMLElement | null): void {
  if (!shell) return;
  const live = shell.previousElementSibling;
  if (live?.matches('[aria-live="assertive"][data-cy-shell]')) live.remove();
  shell.remove();
}

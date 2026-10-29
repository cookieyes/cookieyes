import type { ConsentRuntime } from "@cookieyes/core";
import {
  categoryText,
  closeOnEscape,
  focusDialog,
  initialOptOutState,
  type OptOutEvent,
  type OptOutState,
  optOut,
  optOutReducer,
  preferences,
  renderToDom,
  startOptOutCountdown,
  trapFocus,
  type UiNode,
} from "@cookieyes/ui";
import { morph } from "./morph.js";

// The preferences and opt-out dialogs. A module of its own, loaded the first
// time either opens, so a page whose visitors only see the banner never
// downloads it.

/** What the dialogs need from the widget that loaded them. */
export type DialogContext = {
  runtime: ConsentRuntime;
  /** Applies the theme to an element; returns the cleanup. */
  themed: (el: HTMLElement) => () => void;
  newId: (name: string) => string;
  isOptOutOpen: () => boolean;
  closeOptOut: () => void;
};

/** The dialogs, drawn from the current state on every `render`. */
export type Dialogs = { render: () => void; destroy: () => void };

/** An open dialog: its element, what undoes its behaviour, and the focus hand-back. */
type Open = { el: HTMLElement; undo: Array<() => void>; restoreFocus: () => void };

function close(dialog: Open | undefined): void {
  if (!dialog) return;
  for (const undo of dialog.undo) undo();
  dialog.el.remove();
  // After the element is gone, so focus never stays inside a removed dialog.
  dialog.restoreFocus();
}

function partOf(e: Event): string | null {
  return (
    (e.target as Element | null)?.closest("[data-cy-part]")?.getAttribute("data-cy-part") ?? null
  );
}

export function createDialogs({
  runtime,
  themed,
  newId,
  isOptOutOpen,
  closeOptOut,
}: DialogContext): Dialogs {
  const manager = runtime.consentManager;
  const store = runtime.consentStore;
  let prefs: Open | undefined;
  let optOutDialog: Open | undefined;
  let optOutState: OptOutState = initialOptOutState(manager.categories);
  let stopCountdown: (() => void) | undefined;
  const ids = {
    prefsTitle: newId("preferences-title"),
    optOutTitle: newId("optout-title"),
    checkbox: newId("optout-checkbox"),
  };

  /** Categories the visitor can switch, in the order their switches appear. */
  function optionalIds(): string[] {
    return store.categories.ids.filter((id) => !store.categories.requiredIds.has(id));
  }

  function preferencesMarkup() {
    const t = store.translations;
    return preferences({
      translations: t,
      titleId: ids.prefsTitle,
      categories: store.categories.ids.map((id) => {
        const required = store.categories.requiredIds.has(id);
        return {
          id,
          ...categoryText(id, {
            translated: store.getCategoryText(id),
            configured: store.categories.list.find((c) => c.id === id),
            defaults: t.categories[id],
          }),
          checked: required || manager.categories[id] === true,
          required,
        };
      }),
    });
  }

  function optOutMarkup() {
    return optOut({
      translations: store.translations,
      titleId: ids.optOutTitle,
      checkboxId: ids.checkbox,
      optedOut: optOutState.optedOut,
      confirmation: optOutState.confirmed ? { secondsLeft: optOutState.secondsLeft } : undefined,
    });
  }

  function dispatch(event: OptOutEvent): void {
    optOutState = optOutReducer(optOutState, event);
    render();
  }

  function openDialog(markup: UiNode, onClose: () => void): Open {
    const el = renderToDom(markup) as HTMLElement;
    document.body.appendChild(el);
    return {
      el,
      undo: [closeOnEscape(onClose), trapFocus(() => el), themed(el)],
      restoreFocus: focusDialog(el),
    };
  }

  function openPreferences(): Open {
    const dialog = openDialog(preferencesMarkup(), () => manager.hidePreferences());
    const onClick = (e: Event) => {
      switch (partOf(e)) {
        case "close":
          manager.hidePreferences();
          break;
        case "accept-all":
          manager.acceptAll("preferences");
          break;
        case "reject-all":
          manager.rejectAll("preferences");
          break;
        case "save":
          manager.savePreferences("preferences");
          break;
      }
    };
    const onChange = (e: Event) => {
      const input = e.target as HTMLInputElement;
      if (input.getAttribute("role") !== "switch") return;
      const switches = Array.from(dialog.el.querySelectorAll('input[role="switch"]'));
      const id = optionalIds()[switches.indexOf(input)];
      if (id) manager.updateCategory(id, input.checked);
    };
    dialog.el.addEventListener("click", onClick);
    dialog.el.addEventListener("change", onChange);
    dialog.undo.push(() => {
      dialog.el.removeEventListener("click", onClick);
      dialog.el.removeEventListener("change", onChange);
    });
    return dialog;
  }

  function openOptOut(): Open {
    optOutState = initialOptOutState(manager.categories);
    const dialog = openDialog(optOutMarkup(), closeOptOut);
    const onClick = (e: Event) => {
      const part = partOf(e);
      if (part === "close" || part === "cancel") {
        closeOptOut();
        return;
      }
      if (part !== "confirm") return;
      // The confirmation is for an opt-out; saving without one records the
      // opt-in and closes at once.
      if (!optOutState.optedOut) {
        manager.acceptAll("optout");
        closeOptOut();
        return;
      }
      manager.rejectAll("optout");
      dispatch({ type: "confirm" });
      dialog.el.querySelector<HTMLElement>('[data-cy-part="confirmation"]')?.focus();
      stopCountdown = startOptOutCountdown(
        (secondsLeft) => dispatch({ type: "tick", secondsLeft }),
        closeOptOut,
      );
    };
    const onChange = (e: Event) => {
      const input = e.target as HTMLInputElement;
      if (input.getAttribute("data-cy-part") === "checkbox") {
        dispatch({ type: "toggle", optedOut: input.checked });
      }
    };
    dialog.el.addEventListener("click", onClick);
    dialog.el.addEventListener("change", onChange);
    dialog.undo.push(() => {
      dialog.el.removeEventListener("click", onClick);
      dialog.el.removeEventListener("change", onChange);
      stopCountdown?.();
      stopCountdown = undefined;
    });
    return dialog;
  }

  function render(): void {
    if (manager.isPreferencesOpen) {
      if (prefs) morph(prefs.el, preferencesMarkup());
      else prefs = openPreferences();
    } else {
      close(prefs);
      prefs = undefined;
    }
    if (isOptOutOpen()) {
      if (optOutDialog) morph(optOutDialog.el, optOutMarkup());
      else optOutDialog = openOptOut();
    } else {
      close(optOutDialog);
      optOutDialog = undefined;
    }
  }

  return {
    render,
    destroy() {
      for (const dialog of [prefs, optOutDialog]) {
        if (!dialog) continue;
        for (const undo of dialog.undo) undo();
        dialog.el.remove();
      }
      prefs = undefined;
      optOutDialog = undefined;
    },
  };
}

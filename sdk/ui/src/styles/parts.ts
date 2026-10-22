/**
 * Single source of truth for the `data-cy-part` / `data-cy-state` hooks that
 * every component exposes for styling. Developers target these in plain CSS,
 * e.g. `[data-cy-part="accept-all"]` or `[data-cy-part="toggle"][data-cy-state="on"]`.
 *
 * These names are a **stable public contract** — treat a rename as a breaking
 * change. Keeping them here means one place to edit and no drift across
 * components.
 */
export const CY_PART = {
  banner: {
    root: "banner",
    title: "title",
    description: "description",
    actions: "actions",
    acceptAll: "accept-all",
    rejectAll: "reject-all",
    customise: "customise",
    doNotSell: "do-not-sell",
    close: "close",
    branding: "branding",
  },
  dialog: {
    overlay: "overlay",
    root: "dialog",
    title: "title",
    close: "close",
    intro: "intro",
    category: "category",
    categoryLabel: "category-label",
    categoryDescription: "category-description",
    toggle: "toggle",
    acceptAll: "accept-all",
    rejectAll: "reject-all",
    save: "save",
    branding: "branding",
  },
  optOut: {
    root: "optout",
    title: "title",
    message: "message",
    confirm: "confirm",
    close: "close",
  },
  recall: {
    root: "recall",
  },
  reloadNotice: {
    root: "reload-notice",
    message: "reload-message",
    dismiss: "reload-dismiss",
  },
} as const;

/** On/off marker for toggles, so `[data-cy-part="toggle"][data-cy-state="on"]` works. */
export const CY_STATE = {
  on: "on",
  off: "off",
} as const;

type Leaves<T> = T extends string ? T : T extends object ? Leaves<T[keyof T]> : never;

/** Every valid `data-cy-part` value. */
export type CyPart = Leaves<typeof CY_PART>;
/** Every valid `data-cy-state` value. */
export type CyState = (typeof CY_STATE)[keyof typeof CY_STATE];

import type { ComponentSidecarEntry } from "@/lib/component-reference-types";

/**
 * Hand-maintained, type-checked prose data for every documented prop of the six
 * `@cookieyes/svelte` components with real props. `ReloadNotice` takes no props and is
 * intentionally absent.
 *
 * `scripts/generate-component-reference.mjs` extracts the structural facts (type, required) for
 * each prop from the props types in `sdk/svelte/src` with the TypeScript compiler API and joins
 * them against this file by `(component, path)`. It fails the build if a path here has no match
 * in the SDK (stale entry) or if the SDK has a prop with no entry here (undocumented prop). The
 * React equivalent is `component-props.sidecar.ts`.
 *
 * Svelte differences from React that the entries state: `class` instead of `className`, a
 * lowercase `onclick`, and snippets (`children`, `placeholder`) in place of React children.
 *
 * `defaultLocation` is required whenever `default` is non-null.
 */
export const componentSidecarEntries: ComponentSidecarEntry[] = [
  // ── CookieBanner ───────────────────────────────────────────────────────────
  {
    component: "CookieBanner",
    path: "class",
    description:
      "Adds a class to the banner's outer card. Merges with our own classes rather than replacing them. Ours are single-class rules with no `!important`, so yours ties and wins on source order when your stylesheet loads after ours.",
    default: null,
    defaultLocation: null,
    ifOmitted: "No extra class is applied; only our own built-in classes are.",
  },
  {
    component: "CookieBanner",
    path: "style",
    description:
      "Inline styles on the banner's outer card. Like `class`, this merges with (and, being inline, always wins over) our own styling.",
    default: null,
    defaultLocation: null,
    ifOmitted: "No extra inline styles; only our own defaults apply.",
  },
  {
    component: "CookieBanner",
    path: "classNames",
    description:
      "Per-part classes, keyed by part name. See the ### Parts table on this page for every valid key. Each merges with our own class for that part the same way `class` merges on the card.",
    default: null,
    defaultLocation: null,
    ifOmitted: "No per-part class overrides; every part keeps only its own built-in class.",
  },
  {
    component: "CookieBanner",
    path: "styles",
    description:
      "Per-part inline styles, keyed by part name. See the ### Parts table on this page for every valid key. Each merges with (and wins over) our own inline styling for that part.",
    default: null,
    defaultLocation: null,
    ifOmitted: "No per-part inline style overrides; only our own defaults apply.",
  },

  // ── CookiePreferences ───────────────────────────────────────────────────────────
  {
    component: "CookiePreferences",
    path: "class",
    description:
      "Adds a class to the dialog's card. Merges with our own classes rather than replacing them. Ours are single-class rules with no `!important`, so yours ties and wins on source order when your stylesheet loads after ours.",
    default: null,
    defaultLocation: null,
    ifOmitted: "No extra class is applied; only our own built-in classes are.",
  },
  {
    component: "CookiePreferences",
    path: "style",
    description:
      "Inline styles on the dialog's card. Like `class`, this merges with (and, being inline, always wins over) our own styling.",
    default: null,
    defaultLocation: null,
    ifOmitted: "No extra inline styles; only our own defaults apply.",
  },
  {
    component: "CookiePreferences",
    path: "classNames",
    description:
      "Per-part classes, keyed by part name. See the ### Parts table on this page for every valid key. Each merges with our own class for that part the same way `class` merges on the card.",
    default: null,
    defaultLocation: null,
    ifOmitted: "No per-part class overrides; every part keeps only its own built-in class.",
  },
  {
    component: "CookiePreferences",
    path: "styles",
    description:
      "Per-part inline styles, keyed by part name. See the ### Parts table on this page for every valid key. Each merges with (and wins over) our own inline styling for that part.",
    default: null,
    defaultLocation: null,
    ifOmitted: "No per-part inline style overrides; only our own defaults apply.",
  },

  // ── CookieOptOut ───────────────────────────────────────────────────────────
  {
    component: "CookieOptOut",
    path: "class",
    description:
      "Adds a class to the opt-out dialog's card. Merges with our own classes rather than replacing them. Ours are single-class rules with no `!important`, so yours ties and wins on source order when your stylesheet loads after ours.",
    default: null,
    defaultLocation: null,
    ifOmitted: "No extra class is applied; only our own built-in classes are.",
  },
  {
    component: "CookieOptOut",
    path: "style",
    description:
      "Inline styles on the opt-out dialog's card. Like `class`, this merges with (and, being inline, always wins over) our own styling.",
    default: null,
    defaultLocation: null,
    ifOmitted: "No extra inline styles; only our own defaults apply.",
  },
  {
    component: "CookieOptOut",
    path: "classNames",
    description:
      "Per-part classes, keyed by part name. See the ### Parts table on this page for every valid key. Each merges with our own class for that part the same way `class` merges on the card.",
    default: null,
    defaultLocation: null,
    ifOmitted: "No per-part class overrides; every part keeps only its own built-in class.",
  },
  {
    component: "CookieOptOut",
    path: "styles",
    description:
      "Per-part inline styles, keyed by part name. See the ### Parts table on this page for every valid key. Each merges with (and wins over) our own inline styling for that part.",
    default: null,
    defaultLocation: null,
    ifOmitted: "No per-part inline style overrides; only our own defaults apply.",
  },

  // ── RecallButton ───────────────────────────────────────────────────────
  {
    component: "RecallButton",
    path: "class",
    description:
      'Sets the button\'s class. Unlike the presets, this REPLACES our default class rather than merging with it: the source is `class={klass ?? "cy-widget"}`. Passing a `class` means you take over all of the visual styling `cy-widget` would otherwise provide; there is no merge safety net.',
    default: '"cy-widget"',
    defaultLocation: "sdk/svelte/src/controls/RecallButton.svelte",
    ifOmitted: 'Falls back to our own "cy-widget" class, which carries the button\'s default appearance.',
  },
  {
    component: "RecallButton",
    path: "onclick",
    description:
      "Your own click handler. Runs before ours (chained), not instead of it: the button still opens the right dialog for the active regulation, unless your handler calls `event.preventDefault()`.",
    default: null,
    defaultLocation: null,
    ifOmitted: "Only our own click handler runs (it opens the appropriate dialog).",
  },
  {
    component: "RecallButton",
    path: "children",
    description:
      "Snippet with custom contents to render inside the button, replacing our default reopen icon entirely.",
    default: null,
    defaultLocation: null,
    ifOmitted: "Renders our default reopen icon.",
  },
  {
    component: "RecallButton",
    path: "...rest",
    description:
      "Every other standard `<button>` attribute (`id`, `disabled`, `aria-*`, `data-*`, and so on, other than `class` and `onclick`, documented above). They are spread onto the `<button>` after our own, so one you pass wins over ours.",
    default: null,
    defaultLocation: null,
    ifOmitted: 'Only our own attributes apply (`type="button"`, a translated `aria-label` and `aria-haspopup="dialog"`).',
  },

  // ── GatedScript ────────────────────────────────────────────────────────
  {
    component: "GatedScript",
    path: "src",
    description: "The script URL to load once consent for `category` is granted.",
    default: null,
    defaultLocation: null,
    ifOmitted: "Required. Omitting it is a type error under `svelte-check`: there is no default.",
  },
  {
    component: "GatedScript",
    path: "category",
    description: "The consent category that gates loading this script.",
    default: null,
    defaultLocation: null,
    ifOmitted: "Required. Omitting it is a type error under `svelte-check`: there is no default.",
  },
  {
    component: "GatedScript",
    path: "id",
    description:
      "A stable identifier for this script registration. Changing `id`, `src` or `category` registers the script again.",
    default: null,
    defaultLocation: null,
    ifOmitted: "Required. Omitting it is a type error under `svelte-check`: there is no default.",
  },
  {
    component: "GatedScript",
    path: "onLoad",
    description:
      "Called after the script has finished loading. It is read each time the script is registered, so changing only `onLoad` does not re-register it.",
    default: null,
    defaultLocation: null,
    ifOmitted: "No callback fires when the script finishes loading.",
  },

  // ── GatedFrame ─────────────────────────────────────────────────────────
  {
    component: "GatedFrame",
    path: "src",
    description:
      "The iframe URL, used once `category` is allowed. Kept separate from `...rest` because it is always required, unlike the other native iframe attributes.",
    default: null,
    defaultLocation: null,
    ifOmitted: "Required. Omitting it is a type error under `svelte-check`: there is no default.",
  },
  {
    component: "GatedFrame",
    path: "category",
    description: "The consent category that gates rendering the real iframe.",
    default: null,
    defaultLocation: null,
    ifOmitted: "Required. Omitting it is a type error under `svelte-check`: there is no default.",
  },
  {
    component: "GatedFrame",
    path: "placeholder",
    description:
      "Snippet with custom content shown instead of the iframe until consent for `category` is granted, replacing our default placeholder text and button entirely.",
    default: null,
    defaultLocation: null,
    ifOmitted:
      "Shows our own default placeholder (translatable via the `gatedFrame.placeholder` and `gatedFrame.action` keys) and a button that opens preferences.",
  },
  {
    component: "GatedFrame",
    path: "...rest",
    description:
      "Every other standard `<iframe>` attribute (`width`, `height`, `title`, `allow`, `sandbox`, and so on, other than `src`, documented above). They are spread onto the `<iframe>` once it is allowed to render.",
    default: null,
    defaultLocation: null,
    ifOmitted: "No extra iframe attributes are applied beyond `src`.",
  },
];

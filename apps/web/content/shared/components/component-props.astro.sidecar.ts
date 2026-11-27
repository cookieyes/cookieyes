import type { ComponentSidecarEntry } from "@/lib/component-reference-types";

/**
 * Hand-maintained, type-checked prose data for every documented prop of the six
 * `@cookieyes/astro` components with real props. `ReloadNotice` takes no props and is
 * intentionally absent.
 *
 * `scripts/generate-component-reference.mjs` extracts the structural facts (type, required) for
 * each prop from `sdk/astro/src/components/components.d.ts`, where every component is declared as
 * `AstroComponent<Props>`, with the TypeScript compiler API and joins them against this file by
 * `(component, path)`. It fails the build if a path here has no match in the SDK (stale entry) or
 * if the SDK has a prop with no entry here (undocumented prop). The React equivalent is
 * `component-props.sidecar.ts`.
 *
 * Astro differences from React that the entries state: `class` instead of `className`, no
 * `style` or `styles` (the banner never carries a `style` attribute, so a strict CSP needs no
 * allowance for it), no `onClick` and no `onLoad` (a prop cannot hold a function across the
 * server boundary), and a `placeholder` slot in place of the `placeholder` prop.
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
    path: "classNames",
    description:
      "Per-part classes, keyed by part name. See the ### Parts table on this page for every valid key. Each merges with our own class for that part the same way `class` merges on the card. The classes are applied in the server HTML and again by the browser every time it redraws the banner.",
    default: null,
    defaultLocation: null,
    ifOmitted: "No per-part class overrides; every part keeps only its own built-in class.",
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
    path: "classNames",
    description:
      "Per-part classes, keyed by part name. See the ### Parts table on this page for every valid key. Each merges with our own class for that part the same way `class` merges on the card.",
    default: null,
    defaultLocation: null,
    ifOmitted: "No per-part class overrides; every part keeps only its own built-in class.",
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
    path: "classNames",
    description:
      "Per-part classes, keyed by part name. See the ### Parts table on this page for every valid key. Each merges with our own class for that part the same way `class` merges on the card.",
    default: null,
    defaultLocation: null,
    ifOmitted: "No per-part class overrides; every part keeps only its own built-in class.",
  },

  // ── RecallButton ───────────────────────────────────────────────────────
  {
    component: "RecallButton",
    path: "class",
    description:
      "Adds a class to the button. Unlike `className` in React, this MERGES with our default `cy-widget` class instead of replacing it, so the button keeps its look and yours adds to it. It is the only prop: the button takes no children and no other attributes.",
    default: null,
    defaultLocation: null,
    ifOmitted: "Only our own `cy-widget` class is applied.",
  },

  // ── GatedScript ────────────────────────────────────────────────────────
  {
    component: "GatedScript",
    path: "id",
    description:
      "A stable identifier for this script. Scripts are registered once per id, so two components with the same `id` load the script once.",
    default: null,
    defaultLocation: null,
    ifOmitted: "Required. Omitting it is a type error under `astro check`: there is no default.",
  },
  {
    component: "GatedScript",
    path: "src",
    description: "The script URL to load once consent for `category` is granted.",
    default: null,
    defaultLocation: null,
    ifOmitted: "Required. Omitting it is a type error under `astro check`: there is no default.",
  },
  {
    component: "GatedScript",
    path: "category",
    description: "The consent category that gates loading this script.",
    default: null,
    defaultLocation: null,
    ifOmitted: "Required. Omitting it is a type error under `astro check`: there is no default.",
  },

  // ── GatedFrame ─────────────────────────────────────────────────────────
  {
    component: "GatedFrame",
    path: "src",
    description:
      "The iframe URL, used once `category` is allowed. Kept separate from `...rest` because it is always required, unlike the other native iframe attributes.",
    default: null,
    defaultLocation: null,
    ifOmitted: "Required. Omitting it is a type error under `astro check`: there is no default.",
  },
  {
    component: "GatedFrame",
    path: "category",
    description: "The consent category that gates rendering the real iframe.",
    default: null,
    defaultLocation: null,
    ifOmitted: "Required. Omitting it is a type error under `astro check`: there is no default.",
  },
  {
    component: "GatedFrame",
    path: "placeholder (slot)",
    description:
      "A named slot, `<Fragment slot=\"placeholder\">`, with custom content shown instead of the iframe until consent for `category` is granted. It replaces our default placeholder text and button entirely.",
    default: null,
    defaultLocation: null,
    ifOmitted:
      "Shows our own default placeholder (translatable via the `gatedFrame.placeholder` and `gatedFrame.action` keys) and a button that opens preferences.",
  },
  {
    component: "GatedFrame",
    path: "...rest",
    description:
      "Every other standard `<iframe>` attribute (`width`, `height`, `title`, `allow`, `sandbox`, and so on, other than `src`, documented above). Text, number and boolean values are copied onto the `<iframe>` once it is allowed to render; a function value is dropped.",
    default: null,
    defaultLocation: null,
    ifOmitted: "No extra iframe attributes are applied beyond `src`.",
  },
];

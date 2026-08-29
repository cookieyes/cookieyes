import type { ComponentSidecarEntry } from "@/lib/component-reference-types";

/**
 * Hand-maintained, type-checked prose data for every documented prop of the
 * six components with real props (`CookieBanner`, `CookiePreferences`,
 * `CookieOptOut`, `RecallButton`, `GatedScript`, `GatedFrame`). `ReloadNotice`
 * takes no props and is intentionally absent — see design §2.4.
 *
 * `scripts/generate-component-reference.mjs` extracts the *structural* facts
 * (type, required) for each prop via the TypeScript compiler API and joins
 * them against this file by `(component, path)`. The generator fails the
 * build if a path here has no match in the compiler's extraction (stale
 * entry) or if the compiler finds a prop with no entry here (undocumented
 * prop). See ai-context/designs/component-reference-docs.md §2.2/§2.4.
 *
 * `defaultLocation` is required whenever `default` is non-null.
 */
export const componentSidecarEntries: ComponentSidecarEntry[] = [
  // ── CookieBanner ───────────────────────────────────────────────────────
  {
    component: "CookieBanner",
    path: "className",
    description:
      "Adds a class to the banner's outer card. Merges with our own classes rather than replacing them. Ours are single-class rules with no `!important`, so yours ties and wins on source order when your stylesheet loads after ours.",
    default: null,
    defaultLocation: null,
    ifOmitted: "No extra class is applied — the banner renders with only its own built-in classes.",
  },
  {
    component: "CookieBanner",
    path: "style",
    description:
      "Inline styles on the outer card. Like `className`, this merges with (and, being inline, always wins over) our own styling.",
    default: null,
    defaultLocation: null,
    ifOmitted: "No extra inline styles — only our own defaults apply.",
  },
  {
    component: "CookieBanner",
    path: "classNames",
    description:
      "Per-part classes, keyed by part name. See the ### Parts table on this page for every valid key — each merges with our own class for that part the same way `className` merges on the root.",
    default: null,
    defaultLocation: null,
    ifOmitted: "No per-part class overrides — every part keeps only its own built-in class.",
  },
  {
    component: "CookieBanner",
    path: "styles",
    description:
      "Per-part inline styles, keyed by part name. See the ### Parts table on this page for every valid key — each merges with (and wins over) our own inline styling for that part.",
    default: null,
    defaultLocation: null,
    ifOmitted: "No per-part inline style overrides — only our own defaults apply.",
  },

  // ── CookiePreferences ──────────────────────────────────────────────────
  {
    component: "CookiePreferences",
    path: "className",
    description:
      "Adds a class to the dialog's outer card. Merges with our own classes rather than replacing them. Ours are single-class rules with no `!important`, so yours ties and wins on source order when your stylesheet loads after ours.",
    default: null,
    defaultLocation: null,
    ifOmitted: "No extra class is applied — the dialog renders with only its own built-in classes.",
  },
  {
    component: "CookiePreferences",
    path: "style",
    description:
      "Inline styles on the dialog's outer card. Like `className`, this merges with (and, being inline, always wins over) our own styling.",
    default: null,
    defaultLocation: null,
    ifOmitted: "No extra inline styles — only our own defaults apply.",
  },
  {
    component: "CookiePreferences",
    path: "classNames",
    description:
      "Per-part classes, keyed by part name — including the toggle and category rows. See the ### Parts table on this page for every valid key; each merges with our own class for that part.",
    default: null,
    defaultLocation: null,
    ifOmitted: "No per-part class overrides — every part keeps only its own built-in class.",
  },
  {
    component: "CookiePreferences",
    path: "styles",
    description:
      "Per-part inline styles, keyed by part name. See the ### Parts table on this page for every valid key; each merges with (and wins over) our own inline styling for that part.",
    default: null,
    defaultLocation: null,
    ifOmitted: "No per-part inline style overrides — only our own defaults apply.",
  },

  // ── CookieOptOut ───────────────────────────────────────────────────────
  {
    component: "CookieOptOut",
    path: "className",
    description:
      "Adds a class to the opt-out dialog's outer card. Merges with our own classes rather than replacing them. Ours are single-class rules with no `!important`, so yours ties and wins on source order when your stylesheet loads after ours.",
    default: null,
    defaultLocation: null,
    ifOmitted: "No extra class is applied — the dialog renders with only its own built-in classes.",
  },
  {
    component: "CookieOptOut",
    path: "style",
    description:
      "Inline styles on the opt-out dialog's outer card. Like `className`, this merges with (and, being inline, always wins over) our own styling.",
    default: null,
    defaultLocation: null,
    ifOmitted: "No extra inline styles — only our own defaults apply.",
  },
  {
    component: "CookieOptOut",
    path: "classNames",
    description:
      "Per-part classes, keyed by part name. See the ### Parts table on this page for every valid key; each merges with our own class for that part.",
    default: null,
    defaultLocation: null,
    ifOmitted: "No per-part class overrides — every part keeps only its own built-in class.",
  },
  {
    component: "CookieOptOut",
    path: "styles",
    description:
      "Per-part inline styles, keyed by part name. See the ### Parts table on this page for every valid key; each merges with (and wins over) our own inline styling for that part.",
    default: null,
    defaultLocation: null,
    ifOmitted: "No per-part inline style overrides — only our own defaults apply.",
  },

  // ── RecallButton ───────────────────────────────────────────────────────
  {
    component: "RecallButton",
    path: "children",
    description:
      "Custom contents to render inside the button, replacing our default reopen icon entirely.",
    default: null,
    defaultLocation: null,
    ifOmitted: "Renders our default reopen icon (`<RevisitIcon />`).",
  },
  {
    component: "RecallButton",
    path: "className",
    description:
      'Sets the button\'s class. Unlike every other component on this page and every other preset in this batch, this REPLACES our default class rather than merging with it — the source is literally `className={className ?? "cy-widget"}`. Supplying a `className` here means you take over all of the visual styling `cy-widget` would otherwise have provided; there is no cascade-merge safety net.',
    default: '"cy-widget"',
    defaultLocation: "sdk/react/src/controls/RecallButton.tsx",
    ifOmitted: 'Falls back to our own "cy-widget" class, which carries the button\'s default appearance.',
  },
  {
    component: "RecallButton",
    path: "onClick",
    description:
      "Your own click handler. Runs alongside ours (chained), not instead of it — the button still opens the right dialog for the active regulation.",
    default: null,
    defaultLocation: null,
    ifOmitted: "Only our own click handler runs (it opens the appropriate dialog).",
  },
  {
    component: "RecallButton",
    path: "ref",
    description:
      "Forwarded to the underlying `<button>` element via `React.forwardRef` — added by the component's forwardRef wrapper, not a member of `RecallButtonProps` itself.",
    default: null,
    defaultLocation: null,
    ifOmitted: "No ref is forwarded; you simply don't get a handle to the underlying DOM node.",
  },
  {
    component: "RecallButton",
    path: "...rest",
    description:
      'Every other standard `<button>` HTML attribute (`id`, `type`, `disabled`, `aria-*`, `data-*`, and so on, other than `className`/`onClick`, documented above) — spread directly onto the underlying `<button>` element.',
    default: null,
    defaultLocation: null,
    ifOmitted: 'Only our own defaults for those attributes apply (e.g. `type="button"`).',
  },

  // ── GatedScript ────────────────────────────────────────────────────────
  {
    component: "GatedScript",
    path: "src",
    description: "The script URL to load once consent for `category` is granted.",
    default: null,
    defaultLocation: null,
    ifOmitted: "Required. Omitting it is a compile-time type error — there is no default.",
  },
  {
    component: "GatedScript",
    path: "category",
    description: "The consent category that gates loading this script.",
    default: null,
    defaultLocation: null,
    ifOmitted: "Required. Omitting it is a compile-time type error — there is no default.",
  },
  {
    component: "GatedScript",
    path: "id",
    description:
      "A stable identifier for this script registration. Registering a second script under the same id silently overwrites the first — there is no warning.",
    default: null,
    defaultLocation: null,
    ifOmitted: "Required. Omitting it is a compile-time type error — there is no default.",
  },
  {
    component: "GatedScript",
    path: "onLoad",
    description: "Called once, after the script has finished loading.",
    default: null,
    defaultLocation: null,
    ifOmitted: "No callback fires when the script finishes loading.",
  },

  // ── GatedFrame ─────────────────────────────────────────────────────────
  {
    component: "GatedFrame",
    path: "src",
    description:
      "The iframe URL, used once `category` is allowed. Kept separate from `...rest` because it's the one prop that's always required, unlike the other native iframe attributes.",
    default: null,
    defaultLocation: null,
    ifOmitted: "Required. Omitting it is a compile-time type error — there is no default.",
  },
  {
    component: "GatedFrame",
    path: "category",
    description: "The consent category that gates rendering the real iframe.",
    default: null,
    defaultLocation: null,
    ifOmitted: "Required. Omitting it is a compile-time type error — there is no default.",
  },
  {
    component: "GatedFrame",
    path: "placeholder",
    description:
      "Custom content shown instead of the iframe until consent for `category` is granted, replacing our default placeholder text and button entirely.",
    default: null,
    defaultLocation: null,
    ifOmitted:
      "Shows our own default placeholder (translatable via the `gatedFrame.placeholder`/`gatedFrame.action` keys) and a button that opens preferences.",
  },
  {
    component: "GatedFrame",
    path: "...rest",
    description:
      'Every other standard `<iframe>` attribute (`width`, `height`, `title`, `allow`, `sandbox`, and so on, other than `src`, documented above) — spread directly onto the underlying `<iframe>` element once it\'s allowed to render.',
    default: null,
    defaultLocation: null,
    ifOmitted: "No extra iframe attributes are applied beyond `src`.",
  },
];

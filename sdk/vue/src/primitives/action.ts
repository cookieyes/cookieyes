import type { ConsentSource, TranslationMap } from "@cookieyes/core";
import {
  type ButtonHTMLAttributes,
  Comment,
  cloneVNode,
  defineComponent,
  Fragment,
  h,
  isVNode,
  normalizeStyle,
  type ShallowRef,
  Text,
  type VNode,
} from "vue";
import { type ConsentActions, useConsentActions } from "../composables/useConsentActions.js";
import { _useRuntime } from "../composables/useRuntime.js";
import { useTranslations } from "../composables/useTranslations.js";
import { chain, exposeElement, type PartComponent } from "./utils.js";

/** Button attributes plus `asChild`: render your own element and we wire behaviour onto it. */
export type ActionProps = ButtonHTMLAttributes & { asChild?: boolean };

/** A primitive button part. */
export type ActionComponent = PartComponent<ActionProps>;

const HANDLER_KEY = /^on[A-Z]/;

/** The slot's vnodes without fragments, comments and whitespace-only text. */
function flatten(nodes: unknown[]): VNode[] {
  const out: VNode[] = [];
  for (const node of nodes) {
    if (!isVNode(node)) continue;
    if (node.type === Fragment && Array.isArray(node.children)) out.push(...flatten(node.children));
    else if (node.type === Comment) continue;
    else if (node.type === Text && String(node.children).trim() === "") continue;
    else out.push(node);
  }
  return out;
}

/**
 * Merges our behaviour onto the single child instead of rendering our own node (`asChild`).
 * The child's props win; `on*` handlers compose (the child's first, ours skipped when it
 * prevented default); `class` merges and `style` merges with the child last.
 *
 * Handlers are removed from the base vnode before merging. `cloneVNode` would otherwise put the
 * child's handler and the chained one that already calls it side by side, running the child's
 * twice. Passing extra props also forces a full props patch, which a vnode from a compiled
 * template needs for our `aria-label` to follow a language switch.
 */
function mergeIntoChild(
  content: unknown[] | undefined,
  ours: Record<string, unknown>,
  el: ShallowRef<HTMLElement | null>,
): VNode {
  const nodes = flatten(content ?? []);
  const child = nodes[0];
  if (nodes.length !== 1 || !child || child.type === Text) {
    throw new Error("[cookieyes] `asChild` expects exactly one element child.");
  }
  const childProps: Record<string, unknown> = child.props ?? {};
  const base = cloneVNode(child);
  const kept: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(childProps)) {
    if (!HANDLER_KEY.test(key) || !(key in ours)) kept[key] = value;
  }
  if (ours.style !== undefined) delete kept.style;
  base.props = kept;

  const merged: Record<string, unknown> = { ref: el };
  for (const [key, value] of Object.entries(ours)) {
    if (HANDLER_KEY.test(key)) {
      merged[key] = chain(childProps[key], value as (e: Event) => void);
    } else if (key === "style") {
      merged.style = normalizeStyle([value, childProps.style]);
    } else if (key === "class" || !(key in childProps)) {
      merged[key] = value;
    }
  }
  return cloneVNode(base, merged, true);
}

type ActionSpec = {
  /** Written as the user wrote it, for example `Banner.AcceptAll`; names the missing-plugin error. */
  name: string;
  part: string;
  source?: ConsentSource;
  /** Picks the consent action this button runs. */
  run: (actions: ConsentActions) => () => void;
  /** The button's content when the caller gives none. */
  fallback: (t: TranslationMap) => string | VNode | undefined;
  /** Accessible name used when the caller gives none, for icon-only buttons. */
  ariaLabel?: (t: TranslationMap) => string;
  /** Attributes placed between `data-cy-part` and the caller's own. */
  extra?: Record<string, unknown>;
};

/**
 * One button part: our `<button>` or, with `asChild`, the caller's element, with the same
 * behaviour either way. The caller's attributes follow ours, so they win.
 */
export function defineAction(spec: ActionSpec): ActionComponent {
  return defineComponent({
    name: spec.name.replace(".", ""),
    inheritAttrs: false,
    props: { asChild: Boolean },
    setup(props, { attrs, slots, expose }) {
      _useRuntime(`<${spec.name}>`);
      const ours = spec.run(useConsentActions(spec.source));
      const t = useTranslations();
      const el = exposeElement(expose);
      return () => {
        const { onClick, ...rest } = attrs;
        const label = spec.ariaLabel ? (rest["aria-label"] ?? spec.ariaLabel(t.value)) : undefined;
        const behavior: Record<string, unknown> = {
          ...(label !== undefined ? { "aria-label": label } : {}),
          "data-cy-part": spec.part,
          ...spec.extra,
          onClick: chain(onClick, ours),
          ...rest,
        };
        if (props.asChild) return mergeIntoChild(slots.default?.(), behavior, el);
        return h(
          "button",
          { ref: el, type: "button", ...behavior },
          slots.default ? slots.default() : spec.fallback(t.value),
        );
      };
    },
  }) as unknown as ActionComponent;
}

/**
 * A part with no behaviour of its own beyond its element: a tag, our attributes and a fallback
 * for an empty slot. `use` runs in setup, may call composables, and returns the per-render
 * attributes and fallback. The caller's attributes follow ours, so they win.
 */
export function definePart<P>(
  name: string,
  tag: string,
  use: () => () => { attrs?: Record<string, unknown>; fallback?: string | VNode | undefined },
): PartComponent<P> {
  return defineComponent({
    name: name.replace(".", ""),
    inheritAttrs: false,
    setup(_, { attrs, slots, expose }) {
      _useRuntime(`<${name}>`);
      const el = exposeElement(expose);
      const render = use();
      return () => {
        const own = render();
        return h(
          tag,
          { ref: el, ...own.attrs, ...attrs },
          slots.default ? slots.default() : own.fallback,
        );
      };
    },
  }) as unknown as PartComponent<P>;
}

import { closeOnEscape, focusDialog, trapFocus } from "@cookieyes/ui";
import {
  type ComponentOptionsMixin,
  type ComputedOptions,
  type DefineComponent,
  type MethodOptions,
  onMounted,
  type PublicProps,
  type ShallowRef,
  type SlotsType,
  shallowRef,
  type VNode,
  type WatchSource,
  watch,
} from "vue";

/** What a part exposes to a template ref: the node it rendered, not the component instance. */
export type ElementBindings = { readonly element: HTMLElement | null };

/**
 * The public type of a primitive part. Written out so the emitted declarations name it instead
 * of inferring a type from the render function, and so `<Banner.Root>` type-checks in templates.
 */
export type PartComponent<
  P,
  S extends Record<string, unknown> = { default?: () => unknown },
  B = ElementBindings,
> = DefineComponent<
  P,
  B,
  object,
  ComputedOptions,
  MethodOptions,
  ComponentOptionsMixin,
  ComponentOptionsMixin,
  Record<never, never>,
  string,
  PublicProps,
  Readonly<P>,
  object,
  SlotsType<S>
>;

/**
 * Props that set a checkbox's `checked` state as a DOM property only. Vue 3.5.45 also writes a
 * `checked` attribute whenever `checked` is passed as a prop, which `@cookieyes/ui`'s markup and
 * React's output never carry; the attribute is also absent on earlier 3.5 releases, so setting
 * the property from the vnode hooks keeps the markup the same on every supported Vue version.
 */
export function checkedProp(checked: boolean): {
  onVnodeMounted: (vnode: VNode) => void;
  onVnodeUpdated: (vnode: VNode) => void;
} {
  const apply = (vnode: VNode) => {
    (vnode.el as HTMLInputElement).checked = checked;
  };
  return { onVnodeMounted: apply, onVnodeUpdated: apply };
}

/**
 * Runs the caller's handler or handlers first, then ours, unless the caller prevented default.
 * A listener written `@click.prevent` therefore suppresses the consent action, as
 * `e.preventDefault()` does in React. The caller's handler may be an array, which is how Vue
 * stores a repeated listener.
 */
export function chain<E extends { defaultPrevented: boolean }>(
  userHandler: unknown,
  defaultHandler: (e: E) => void,
): (e: E) => void {
  return (e) => {
    const handlers = Array.isArray(userHandler) ? userHandler : [userHandler];
    for (const handler of handlers) {
      if (typeof handler === "function") handler(e);
    }
    if (!e.defaultPrevented) defaultHandler(e);
  };
}

/**
 * Creates the ref a component binds to its root element and exposes it as `element`, since a
 * template ref to a component is the instance, not the node.
 */
export function exposeElement(
  expose: (exposed?: Record<string, unknown>) => void,
): ShallowRef<HTMLElement | null> {
  const el = shallowRef<HTMLElement | null>(null);
  expose({
    get element() {
      return el.value;
    },
  });
  return el;
}

/**
 * Calls `onEscape` on Escape while `enabled` is true. The listener is attached from `onMounted`
 * because setup also runs on the server, and `flush: "post"` so a dialog that has just opened
 * is already on the page.
 */
export function useEscapeKey(enabled: WatchSource<boolean>, onEscape: () => void): void {
  onMounted(() => {
    watch(
      enabled,
      (on, _before, onCleanup) => {
        if (on) onCleanup(closeOnEscape(onEscape));
      },
      { immediate: true, flush: "post" },
    );
  });
}

/**
 * Moves focus into the dialog when `open` turns on and hands it back to its opener when it turns
 * off. See `focusDialog` in `@cookieyes/ui`; the opener is remembered by `rememberOpener`, which
 * the opening actions call.
 */
export function useAutoFocusDialog(
  open: WatchSource<boolean>,
  el: ShallowRef<HTMLElement | null>,
): void {
  onMounted(() => {
    watch(
      open,
      (isOpen, _before, onCleanup) => {
        if (isOpen) onCleanup(focusDialog(el.value));
      },
      { immediate: true, flush: "post" },
    );
  });
}

/** Keeps Tab inside the element while `enabled` is true. */
export function useFocusTrap(
  enabled: WatchSource<boolean>,
  el: ShallowRef<HTMLElement | null>,
): void {
  onMounted(() => {
    watch(
      enabled,
      (on, _before, onCleanup) => {
        if (on) onCleanup(trapFocus(() => el.value));
      },
      { immediate: true, flush: "post" },
    );
  });
}

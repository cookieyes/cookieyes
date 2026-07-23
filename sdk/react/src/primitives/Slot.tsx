"use client";

import {
  Children,
  type CSSProperties,
  cloneElement,
  forwardRef,
  isValidElement,
  type ReactElement,
  type ReactNode,
  type Ref,
} from "react";

type AnyProps = Record<string, unknown>;

/** Point every ref at the same node. */
function composeRefs<T>(...refs: Array<Ref<T> | undefined>): (node: T | null) => void {
  return (node) => {
    for (const ref of refs) {
      if (typeof ref === "function") ref(node);
      else if (ref) (ref as { current: T | null }).current = node;
    }
  };
}

/**
 * The child's ref, read in a way that works on both React 18 (ref lives on the
 * element) and React 19 (ref is a normal prop). Prefer the prop form.
 */
function childRef(child: ReactElement): Ref<unknown> | undefined {
  const asProp = (child.props as AnyProps).ref as Ref<unknown> | undefined;
  if (asProp) return asProp;
  return (child as unknown as { ref?: Ref<unknown> }).ref;
}

/** Run the child's handler first, then ours — unless the child prevented it. */
function composeHandlers(
  theirs: unknown,
  ours: unknown,
): (event: { defaultPrevented?: boolean }) => void {
  return (event) => {
    (theirs as ((e: unknown) => void) | undefined)?.(event);
    if (!event?.defaultPrevented) (ours as ((e: unknown) => void) | undefined)?.(event);
  };
}

/**
 * Merges our behaviour props onto a single child element instead of rendering
 * our own node — the `asChild` escape hatch. Event handlers compose (child then
 * ours), `className`/`style` merge, our ref is composed with the child's, and
 * everything else lets the child's own prop win.
 */
export const Slot = forwardRef<HTMLElement, { children?: ReactNode } & AnyProps>(function Slot(
  { children, ...slotProps },
  forwardedRef,
) {
  if (!isValidElement(children)) {
    throw new Error("[cookieyes] `asChild` expects exactly one React element child.");
  }
  const child = Children.only(children) as ReactElement;
  const childProps = child.props as AnyProps;

  // Child props win by default; then compose the ones that must combine.
  const merged: AnyProps = { ...slotProps, ...childProps };
  for (const key of Object.keys(slotProps)) {
    if (/^on[A-Z]/.test(key)) {
      merged[key] = composeHandlers(childProps[key], slotProps[key]);
    } else if (key === "className") {
      merged[key] = [slotProps[key], childProps[key]].filter(Boolean).join(" ") || undefined;
    } else if (key === "style") {
      merged[key] = { ...(slotProps[key] as CSSProperties), ...(childProps[key] as CSSProperties) };
    }
  }
  merged.ref = forwardedRef ? composeRefs(forwardedRef, childRef(child)) : childRef(child);

  return cloneElement(child, merged);
});

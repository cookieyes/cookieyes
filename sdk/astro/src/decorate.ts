import { CY_PART, type UiNode } from "@cookieyes/ui";

/** @internal A component the widget draws, as `@cookieyes/vanilla`'s mount hook names it. */
export type _Surface = "banner" | "preferences" | "optOut" | "recall" | "reloadNotice";

/** @internal Extra classes per part name, keyed as React's `classNames` prop is. */
export type _ClassNames = Partial<Record<string, string>>;

/** @internal The `classNames` of every surface on the page, as the page hands them to the browser. */
export type _PageClassNames = Partial<Record<_Surface, _ClassNames>>;

const PARTS: Record<_Surface, Record<string, string>> = {
  banner: CY_PART.banner,
  preferences: CY_PART.dialog,
  optOut: CY_PART.optOut,
  recall: CY_PART.recall,
  reloadNotice: CY_PART.reloadNotice,
};

/**
 * @internal Adds the developer's `classNames` to `node`: each key names a part, as in React's
 * presets, and its classes go on every element whose `data-cy-part` is that part. The server
 * markup and the browser's widget both run this over the same tree, so the classes survive the
 * widget taking the banner over and every later redraw.
 */
export function _decorate(surface: _Surface, node: UiNode, all: _PageClassNames): UiNode {
  const classNames = all[surface];
  if (!classNames) return node;
  const byPart = new Map<string, string>();
  for (const [key, extra] of Object.entries(classNames)) {
    const part = PARTS[surface][key];
    if (part && extra) byPart.set(part, byPart.has(part) ? `${byPart.get(part)} ${extra}` : extra);
  }
  const walk = (n: UiNode): UiNode => {
    const extra = byPart.get(n.attrs?.["data-cy-part"] ?? "");
    return {
      ...n,
      attrs: extra ? { ...n.attrs, class: `${n.attrs?.class ?? ""} ${extra}`.trim() } : n.attrs,
      children: n.children?.map((c) => (typeof c === "string" ? c : walk(c))),
    };
  };
  return walk(node);
}

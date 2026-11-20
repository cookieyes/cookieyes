/** Inline styles for a part, keyed by camelCase CSS property name or custom property. */
export type CSSProperties = Record<string, string | number | null | undefined>;

/** A style object as the `style` attribute's text, camelCase names written kebab-case. */
function styleText(style: CSSProperties | undefined): string {
  if (!style) return "";
  return Object.entries(style)
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .map(([name, value]) => {
      const property = name.startsWith("--")
        ? name
        : name.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
      return `${property}: ${value}`;
    })
    .join("; ");
}

/**
 * A part's default class merged with the caller's `classNames` and `styles` entry for it. Keys
 * are left out when empty: the markup must carry no attribute the caller did not ask for.
 */
export function part<K extends string>(
  classNames: Partial<Record<K, string>> | undefined,
  styles: Partial<Record<K, CSSProperties>> | undefined,
  key: K,
  base: string,
): { class?: string; style?: string } {
  const cls = [base, classNames?.[key]].filter(Boolean).join(" ");
  const style = styleText(styles?.[key]);
  return { ...(cls ? { class: cls } : {}), ...(style ? { style } : {}) };
}

/**
 * The `style` attribute of the visible card: the caller's `style` with the `root` style on top.
 * Undefined when both are empty, so no empty attribute is written.
 */
export function cardStyle(
  style: string | null | undefined,
  styles: { root?: CSSProperties | undefined } | undefined,
): string | undefined {
  const text = [style, styleText(styles?.root)].filter(Boolean).join("; ");
  return text || undefined;
}

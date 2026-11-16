import { type CSSProperties, normalizeClass, normalizeStyle, type StyleValue } from "vue";

/**
 * A part's default class merged with the caller's `classNames` and `styles` entry for it. Keys
 * are left out when empty: Vue's server renderer writes `class=""` and `style=""` for a key that
 * is present with no value, and the markup must carry no attribute the caller did not ask for.
 */
export function part<K extends string>(
  classNames: Partial<Record<K, string>> | undefined,
  styles: Partial<Record<K, CSSProperties>> | undefined,
  key: K,
  base: string,
): { class?: string; style?: CSSProperties } {
  const cls = [base, classNames?.[key]].filter(Boolean).join(" ");
  const style = styles?.[key];
  return { ...(cls ? { class: cls } : {}), ...(style ? { style } : {}) };
}

/**
 * The visible card's class and style: our classes, then the caller's `class` and the `root`
 * entries. The style is the caller's `style` with the `root` style on top, and is omitted when
 * both are empty.
 */
export function cardAttrs(
  base: string[],
  attrs: { class?: unknown; style?: unknown },
  classNames: { root?: string | undefined } | undefined,
  styles: { root?: CSSProperties | undefined } | undefined,
): { class: string; style?: StyleValue } {
  const style = normalizeStyle([attrs.style as StyleValue, styles?.root]);
  return {
    class: normalizeClass([...base, attrs.class, classNames?.root]),
    ...(style && Object.keys(style).length > 0 ? { style } : {}),
  };
}

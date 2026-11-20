import type { CY_PART } from "@cookieyes/ui";
import type { ClassValue } from "svelte/elements";
import type { CSSProperties } from "./part.js";

/** Every styleable part of the banner: keys for {@link CookieBannerProps.classNames}. */
export type BannerPart = keyof typeof CY_PART.banner;

/** Every styleable part of the preferences dialog: keys for {@link CookiePreferencesProps.classNames}. */
export type DialogPart = keyof typeof CY_PART.dialog;

/** Every styleable part of the opt-out dialog: keys for {@link CookieOptOutProps.classNames}. */
export type OptOutPart = keyof typeof CY_PART.optOut;

/**
 * Styling passthrough. `class` and `style` target the visible banner card; `classNames` and
 * `styles` target individual parts by name (for example `acceptAll`), each merged on top of our
 * defaults. A class you pass always wins over ours (ours are single-class rules with no
 * `!important`, so yours wins on source order when your sheet loads later); an inline `style`
 * wins over any class. `styles` takes camelCase property names or custom properties.
 */
export type CookieBannerProps = {
  class?: ClassValue | undefined;
  style?: string | null | undefined;
  classNames?: Partial<Record<BannerPart, string>> | undefined;
  styles?: Partial<Record<BannerPart, CSSProperties>> | undefined;
};

/**
 * Styling passthrough. `class` and `style` target the dialog card; `classNames` and `styles`
 * target individual parts by name (for example `toggle`, `save`), each merged on top of our
 * defaults. A class you pass always wins over ours (ours are single-class rules with no
 * `!important`, so yours wins on source order when your sheet loads later); an inline `style`
 * wins over any class. Style the checked toggle via the `toggle` part and
 * `[data-cy-state="on"]` (see the styling guide).
 */
export type CookiePreferencesProps = {
  class?: ClassValue | undefined;
  style?: string | null | undefined;
  classNames?: Partial<Record<DialogPart, string>> | undefined;
  styles?: Partial<Record<DialogPart, CSSProperties>> | undefined;
};

/**
 * Styling passthrough. `class` and `style` target the opt-out card; `classNames` and `styles`
 * target individual parts by name, each merged on top of our defaults. A class you pass always
 * wins over ours (ours are single-class rules with no `!important`, so yours wins on source
 * order when your sheet loads later); an inline `style` wins over any class.
 */
export type CookieOptOutProps = {
  class?: ClassValue | undefined;
  style?: string | null | undefined;
  classNames?: Partial<Record<OptOutPart, string>> | undefined;
  styles?: Partial<Record<OptOutPart, CSSProperties>> | undefined;
};

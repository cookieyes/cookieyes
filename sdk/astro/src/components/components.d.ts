// The declarations of `@cookieyes/astro/components`, copied to `dist/components/index.d.ts` by
// `scripts/copy-assets.mjs`. Written by hand because the entry re-exports `.astro` files, which a
// declaration build cannot follow and a type checker outside Astro cannot resolve. Each component
// is typed as Astro types a component, a function of its props.
import type { HTMLAttributes } from "astro/types";

type AstroComponent<Props> = (props: Props) => unknown;

/** Extra classes per part name, keyed as React's `classNames` prop is. */
type ClassNames = Partial<Record<string, string>>;

/** Content passed between a component's tags, which Astro's checker types as `children`. */
type SlotProps = { children?: unknown };

type SurfaceProps = { class?: string | undefined; classNames?: ClassNames | undefined };

/**
 * The whole consent UI: the banner, the preferences dialog, the recall button and, when a CCPA
 * regulation can apply, the opt-out dialog. Put it once in your layout. A default slot replaces
 * that set with your own selection of components.
 */
export declare const CookieYesRoot: AstroComponent<SlotProps>;
/** The consent banner. `class` targets the card and `classNames` each part by name. */
export declare const CookieBanner: AstroComponent<SurfaceProps>;
/** The preferences dialog, drawn in the browser when it opens. */
export declare const CookiePreferences: AstroComponent<SurfaceProps>;
/** The CCPA opt-out dialog, drawn in the browser when it opens. */
export declare const CookieOptOut: AstroComponent<SurfaceProps>;
/** The button that reopens the choice once the banner is gone, drawn in the browser. */
export declare const RecallButton: AstroComponent<{ class?: string | undefined }>;
/** The notice shown when a withdrawn tool can only be stopped by reloading. */
export declare const ReloadNotice: AstroComponent<Record<string, never>>;
/** A third-party script that loads only once its category is granted. */
export declare const GatedScript: AstroComponent<{ id: string; src: string; category: string }>;
/**
 * An iframe built only once its category is granted, with a placeholder until then. Any other
 * attribute is passed to the iframe; the `placeholder` slot replaces the default text.
 */
export declare const GatedFrame: AstroComponent<
  Omit<HTMLAttributes<"iframe">, "src" | "children"> & SlotProps & { src: string; category: string }
>;
/**
 * A privacy-enhanced YouTube embed URL, for a `<GatedFrame />` `src` built in frontmatter.
 * Re-exported from `@cookieyes/core`.
 */
export { type YouTubeEmbedUrlOptions, youTubeEmbedUrl } from "@cookieyes/core";

import type { ConsentCategory, YouTubeEmbedUrlOptions } from "@cookieyes/core";
import type { Snippet } from "svelte";
import type { HTMLButtonAttributes, HTMLIframeAttributes } from "svelte/elements";

/** Button attributes; the children snippet replaces the icon. */
export type RecallButtonProps = Omit<HTMLButtonAttributes, "children"> & { children?: Snippet };

/** Props of `<GatedScript>`. */
export type GatedScriptProps = {
  src: string;
  category: ConsentCategory;
  id: string;
  onLoad?: (() => void) | undefined;
};

/** Props of `<GatedFrame>`; the `placeholder` snippet replaces the default blocked-content text. */
export type GatedFrameProps = Omit<HTMLIframeAttributes, "src" | "children" | "placeholder"> & {
  src: string;
  category: ConsentCategory;
  placeholder?: Snippet;
};

/** Props of `<YouTubeEmbed>`. */
export type YouTubeEmbedProps = Omit<
  GatedFrameProps,
  "src" | "category" | "placeholder" | "title" | "width" | "height"
> &
  YouTubeEmbedUrlOptions & {
    /** Names the video for screen readers. */
    title: string;
    /** The category the player waits for. Defaults to `advertisement`. */
    category?: ConsentCategory | undefined;
    /** An image you host, shown behind the placeholder. Nothing is fetched from YouTube. */
    poster?: string | undefined;
  };

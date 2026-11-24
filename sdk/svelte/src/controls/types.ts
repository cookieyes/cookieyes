import type { ConsentCategory } from "@cookieyes/core";
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

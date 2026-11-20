import type { ConsentCategory } from "@cookieyes/core";
import type { Snippet } from "svelte";
import type { HTMLAttributes, HTMLButtonAttributes } from "svelte/elements";

/**
 * What a part hands its `child` snippet: the attributes and handlers to spread onto your own
 * element. The element then behaves as the part would, with no `<button>` of ours.
 */
export type ChildSnippetProps = { props: Record<string, unknown> };

/** Button attributes plus `child`: render your own element and spread `props` onto it. */
export type ActionProps = Omit<HTMLButtonAttributes, "children"> & {
  children?: Snippet;
  child?: Snippet<[ChildSnippetProps]>;
};

/** Element attributes plus `children`. */
export type PartProps = Omit<HTMLAttributes<HTMLElement>, "children"> & { children?: Snippet };

/** What a `Preferences.Category` snippet receives for one category. */
export type CategoryRenderProps = {
  category: ConsentCategory;
  label: string;
  description: string;
  checked: boolean;
  disabled: boolean;
  toggle: (next: boolean) => void;
};

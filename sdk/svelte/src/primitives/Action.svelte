<script lang="ts">
import type { ConsentSource, TranslationMap } from "@cookieyes/core";
import CrossIcon from "../components/CrossIcon.svelte";
import { type ConsentActions, useConsentActions } from "../hooks/useConsentActions.js";
import { _useRuntime } from "../hooks/useRuntime.js";
import { useTranslations } from "../hooks/useTranslations.svelte.js";
import type { ActionProps } from "./types.js";

/**
 * One button part: our `<button>` or, with a `child` snippet, the caller's element, with the
 * same behaviour either way. The caller's attributes follow ours, so they win. The part
 * wrappers fill in `name`, `part` and the rest; callers never see them.
 */
type Spec = {
  /** Written as the user wrote it, for example `Banner.AcceptAll`; names the missing-provider error. */
  name: string;
  part: string;
  source?: ConsentSource;
  /** Picks the consent action this button runs. */
  run: (actions: ConsentActions) => () => void;
  /** The button's content when the caller gives none. */
  fallback?: (t: TranslationMap) => string;
  /** Draws a cross of this size instead of `fallback`'s text. */
  icon?: { size: number; strokeWidth?: number };
  /** Accessible name used when the caller gives none, for icon-only buttons. */
  ariaLabel?: (t: TranslationMap) => string;
  /** Attributes placed between `data-cy-part` and the caller's own. */
  extra?: Record<string, unknown>;
};

let {
  name,
  part,
  source,
  run,
  fallback,
  icon,
  ariaLabel,
  extra,
  children,
  child,
  onclick,
  ...rest
}: ActionProps & Spec = $props();

// Each wrapper passes a fixed `name`, `run` and `source`, so reading them once is intended.
// svelte-ignore state_referenced_locally
_useRuntime(`<${name}>`);
// svelte-ignore state_referenced_locally
const ours = run(useConsentActions(source));
const t = useTranslations();

const attributes = $derived({
  ...(ariaLabel ? { "aria-label": rest["aria-label"] ?? ariaLabel(t) } : {}),
  "data-cy-part": part,
  ...extra,
  onclick: (e: MouseEvent) => {
    (onclick as ((e: MouseEvent) => void) | null | undefined)?.(e);
    if (!e.defaultPrevented) ours();
  },
  ...rest,
});
</script>

{#if child}
  {@render child({ props: { type: "button", ...attributes } })}
{:else}
  <button type="button" {...attributes}>
    {#if children}{@render children()}{:else if icon}<CrossIcon
        size={icon.size}
        strokeWidth={icon.strokeWidth}
      />{:else}{fallback?.(t)}{/if}
  </button>
{/if}

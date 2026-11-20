<script lang="ts">
import { CY_PART, startOptOutCountdown } from "@cookieyes/ui";
import { setContext, untrack } from "svelte";
import { useConsent } from "../../hooks/useConsent.svelte.js";
import { useConsentActions } from "../../hooks/useConsentActions.js";
import { useOptOutOpen } from "../../hooks/useOptOutOpen.svelte.js";
import { _useRuntime } from "../../hooks/useRuntime.js";
import { _useThemeConfig } from "../../hooks/useThemeConfig.js";
import { _useThemeVars } from "../../hooks/useThemeVars.svelte.js";
import { _OPT_OUT_ROOT } from "../../keys.js";
import type { PartProps } from "../types.js";
import { useAutoFocusDialog, useEscapeKey, useFocusTrap } from "../utils.svelte.js";
import { _createOptOutState } from "./state.svelte.js";

let { children, ...rest }: PartProps = $props();

_useRuntime("<OptOut.Root>");
const open = useOptOutOpen();
const snapshot = useConsent();
const { hideOptOut } = useConsentActions();
const titleId = $props.id();
const optOut = _createOptOutState(snapshot.categories, titleId);
const { theme, colorScheme } = _useThemeConfig("<OptOut.Root>");
let el = $state<HTMLElement | null>(null);

useEscapeKey(() => open.current, hideOptOut);
useFocusTrap(
  () => open.current,
  () => el,
);
useAutoFocusDialog(
  () => open.current,
  () => el,
);
_useThemeVars(() => el, theme, colorScheme);
setContext(_OPT_OUT_ROOT, optOut);

// Resets only when the dialog opens: the categories at that moment are the starting point,
// later changes are the visitor's own.
$effect(() => {
  if (open.current) {
    optOut.dispatch({ type: "open", categories: untrack(() => snapshot.categories) });
  }
});
// Its own derived value, so the countdown restarts only when confirmation changes and not on
// every tick that replaces the state.
const confirmed = $derived(optOut.state.confirmed);
$effect(() => {
  if (!confirmed) return;
  return startOptOutCountdown(
    (secondsLeft) => optOut.dispatch({ type: "tick", secondsLeft }),
    hideOptOut,
  );
});
</script>

{#if open.current}
  <!-- Named by the heading the visitor can see, so the spoken and printed names match. -->
  <div
    bind:this={el}
    role="dialog"
    aria-modal="true"
    aria-labelledby={titleId}
    tabindex="-1"
    data-cy-part={CY_PART.optOut.root}
    {...rest}
  >
    {@render children?.()}
  </div>
{/if}

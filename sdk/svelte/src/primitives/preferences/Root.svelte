<script lang="ts">
import { CY_PART } from "@cookieyes/ui";
import { setContext } from "svelte";
import { useConsentActions } from "../../hooks/useConsentActions.js";
import { usePreferencesOpen } from "../../hooks/usePreferencesOpen.svelte.js";
import { _useRuntime } from "../../hooks/useRuntime.js";
import { _useThemeConfig } from "../../hooks/useThemeConfig.js";
import { _useThemeVars } from "../../hooks/useThemeVars.svelte.js";
import { _PREFERENCES_ROOT } from "../../keys.js";
import type { PartProps } from "../types.js";
import { useAutoFocusDialog, useEscapeKey, useFocusTrap } from "../utils.svelte.js";

let { children, ...rest }: PartProps = $props();

_useRuntime("<Preferences.Root>");
const open = usePreferencesOpen();
const { hidePreferences } = useConsentActions();
const titleId = $props.id();
const { theme, colorScheme } = _useThemeConfig("<Preferences.Root>");
let el = $state<HTMLElement | null>(null);

useEscapeKey(() => open.current, hidePreferences);
useFocusTrap(
  () => open.current,
  () => el,
);
useAutoFocusDialog(
  () => open.current,
  () => el,
);
_useThemeVars(() => el, theme, colorScheme);
// Shared so the dialog can be named by its own visible heading.
setContext(_PREFERENCES_ROOT, { titleId });
</script>

{#if open.current}
  <!-- Named by the heading the visitor can see, so the spoken and printed names match. -->
  <div
    bind:this={el}
    role="dialog"
    aria-modal="true"
    aria-labelledby={titleId}
    tabindex="-1"
    data-cy-part={CY_PART.dialog.overlay}
    {...rest}
  >
    {@render children?.()}
  </div>
{/if}

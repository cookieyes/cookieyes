<script lang="ts">
import { _useThemeConfig } from "../../hooks/useThemeConfig.js";
import { _useThemeVars } from "../../hooks/useThemeVars.svelte.js";

// A div that `_useThemeVars` themes, which the test can destroy and create again.
let { show }: { show: boolean } = $props();
let el = $state<HTMLElement | null>(null);
const { theme, colorScheme } = _useThemeConfig("<Themed>");
_useThemeVars(() => el, theme, colorScheme);
</script>

{#if show}<div bind:this={el} id="themed"></div>{/if}

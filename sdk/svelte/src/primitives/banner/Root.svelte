<script lang="ts">
import { CY_PART, focusRecallAfterBanner } from "@cookieyes/ui";
import { onMount, tick } from "svelte";
import { useBannerVisibility } from "../../hooks/useBannerVisibility.svelte.js";
import { _useRuntime } from "../../hooks/useRuntime.js";
import { _useThemeConfig } from "../../hooks/useThemeConfig.js";
import { _useThemeVars } from "../../hooks/useThemeVars.svelte.js";
import { portal } from "../portal.js";
import type { PartProps } from "../types.js";

let { children, ...rest }: PartProps = $props();

_useRuntime("<Banner.Root>");
const visible = useBannerVisibility();
const { theme, colorScheme } = _useThemeConfig("<Banner.Root>");
let el = $state<HTMLElement | null>(null);
_useThemeVars(() => el, theme, colorScheme);

// Was this banner already on screen when the component first rendered?
//
// The banner is server-rendered inline, then moved into the portal root once mounted. The
// move keeps the node, but the CSS entry animation restarts whenever a node is inserted, so
// a banner that was already visible would fade in a second time, plainly visible on a slow
// device where hydration lands late. Animate when the banner genuinely appears, and set
// `data-cy-entered` to skip the animation when this node is only the move of one that was
// already visible: one created before the component mounted. A banner that appears later
// (after `resetConsent`, say) is created after mount and animates normally. A plain variable,
// not state: it must not schedule an update of its own.
let mounted = false;
onMount(() => {
  mounted = true;
});

function enter(node: HTMLElement): void {
  if (!mounted) node.setAttribute("data-cy-entered", "");
}

let wasVisible = visible.current;
$effect(() => {
  const now = visible.current;
  // After the flush, not in it: the recall button that takes focus is moved into the portal
  // root by its own action in this same flush, and moving an element drops its focus.
  if (wasVisible && !now) void tick().then(focusRecallAfterBanner);
  wasVisible = now;
});
</script>

{#if visible.current}
  <div bind:this={el} data-cy-part={CY_PART.banner.root} {...rest} use:enter use:portal>
    {@render children?.()}
  </div>
{/if}

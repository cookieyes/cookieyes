<script lang="ts">
import { _categoryLabel, _warnUnknownEmbedCategory } from "@cookieyes/core";
import { onMount } from "svelte";
import { useCategories } from "../hooks/useCategories.js";
import { useConsentActions } from "../hooks/useConsentActions.js";
import { useConsentCategory } from "../hooks/useConsentCategory.svelte.js";
import { _useRuntime } from "../hooks/useRuntime.js";
import { _useThemeConfig } from "../hooks/useThemeConfig.js";
import { _useThemeVars } from "../hooks/useThemeVars.svelte.js";
import { useTranslations } from "../hooks/useTranslations.svelte.js";
import { _trackGatedFrame } from "./gated-frame.svelte.js";
import type { GatedFrameProps } from "./types.js";

// An iframe that loads only once its category has been consented to, with a placeholder and a
// button that opens the preferences dialog until then. The other attributes go to the iframe.
let { src, category, placeholder, ...rest }: GatedFrameProps = $props();

const runtime = _useRuntime("<GatedFrame>");
const allowed = useConsentCategory(() => category);
const { showPreferences } = useConsentActions();
const { theme, colorScheme } = _useThemeConfig("<GatedFrame>");
const t = useTranslations();
const categories = useCategories();
let el = $state<HTMLElement | null>(null);
_useThemeVars(() => el, theme, colorScheme);

// Never render a third-party iframe during SSR or the first hydration render: consent is
// per-visitor and only known in the browser, so the server (a shared process) must not
// decide it. Show the placeholder until mounted, then let client consent take over. Keeps
// server and first client render identical (no hydration mismatch, no cross-visitor leak).
let mounted = $state(false);
onMount(() => {
  mounted = true;
});

$effect(() => {
  if (!categories.ids.includes(category)) _warnUnknownEmbedCategory(category);
});
_trackGatedFrame(
  () => src,
  () => category,
);

// Latch: once loaded under a committed grant, keep the iframe for the rest of the session.
// Revoking doesn't swap it back to the placeholder mid-session; the block takes effect on the
// next page load (when `allowed` starts false). A plain variable, not state: it is only
// written while computing `showFrame`, which already depends on everything that changes it.
let everAllowed = false;
const showFrame = $derived.by(() => {
  if (mounted && allowed.current) everAllowed = true;
  return mounted && everAllowed;
});

const copy = $derived(t.gatedFrame);
const split = $derived(copy.placeholder.split("{category}"));
</script>

{#if showFrame}
  <iframe {src} {...rest}></iframe>
{:else}
  <div bind:this={el} class="cy-frame-placeholder">
    {#if placeholder}
      {@render placeholder()}
    {:else}
      <p>
        {split[0] ?? ""}<strong
          >{_categoryLabel(category, t, categories, runtime.getCategoryText(category))}</strong
        >{split[1] ?? ""}
      </p>
      <button class="cy-btn cy-btn-primary" type="button" onclick={() => showPreferences()}
        >{copy.action}</button
      >
    {/if}
  </div>
{/if}

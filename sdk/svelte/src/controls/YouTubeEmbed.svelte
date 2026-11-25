<script lang="ts">
import { _categoryLabel, _embedPlaceholderText, youTubeEmbedUrl } from "@cookieyes/core";
import { useCategories } from "../hooks/useCategories.js";
import { _useRuntime } from "../hooks/useRuntime.js";
import { useTranslations } from "../hooks/useTranslations.svelte.js";
import GatedFrame from "./GatedFrame.svelte";
import type { YouTubeEmbedProps } from "./types.js";

// A YouTube player that loads only while its category is consented to. Until then it shows a
// placeholder with a button that allows the category. Both fill one 16:9 box, so nothing moves
// when they swap. `class` and `style` go to that box; size it with your own class, because the
// SDK writes no inline styles. The other attributes go to the iframe.
const {
  videoId,
  playlistId,
  params,
  domain,
  title,
  category = "advertisement",
  poster,
  class: className,
  style,
  ...rest
}: YouTubeEmbedProps = $props();

const runtime = _useRuntime("<YouTubeEmbed>");
const t = useTranslations();
const categories = useCategories();

const src = $derived(
  youTubeEmbedUrl(
    videoId === undefined ? { playlistId, params, domain } : { videoId, params, domain },
  ),
);
const text = $derived(t.embedPlaceholder ?? _embedPlaceholderText);
const label = $derived(_categoryLabel(category, t, categories, runtime.getCategoryText(category)));
const fill = (template: string) =>
  template.replace("{provider}", "YouTube").replace("{category}", label);
const privacyPolicy = $derived(fill(text.privacyPolicy));

// Allows this one category for the whole site and keeps the visitor's other saved choices, the
// same as the button `blockIframes()` draws.
function allowCategory() {
  const granted = runtime.manager.committedCategories;
  runtime.manager.acceptSelected([...Object.keys(granted).filter((id) => granted[id]), category]);
}
</script>

<div class={["cy-youtube", className]} {style}>
  <!-- The first four attributes are the ones of YouTube's own embed code. -->
  <GatedFrame
    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
    referrerpolicy="strict-origin-when-cross-origin"
    allowfullscreen
    loading="lazy"
    {...rest}
    {src}
    {category}
    {title}
  >
    {#snippet placeholder()}
      <!-- Only an image the developer hosts: YouTube's own thumbnail would contact Google
           before consent. -->
      {#if poster}
        <img class="cy-youtube-poster" src={poster} alt="" loading="lazy" />
      {/if}
      <div class="cy-youtube-content" role="group" aria-label={title}>
        <svg class="cy-youtube-play" viewBox="0 0 48 48" aria-hidden="true">
          <circle cx="24" cy="24" r="24" fill="currentColor" opacity="0.25" />
          <path d="M19 15v18l15-9z" fill="currentColor" />
        </svg>
        <p>{fill(text.message)}</p>
        <button class="cy-btn cy-btn-primary" type="button" onclick={allowCategory}
          >{fill(text.allow)}</button
        >
        <a
          href="https://policies.google.com/privacy"
          target="_blank"
          rel="noopener"
          aria-label={`${privacyPolicy} (${t.opensInNewTab})`}>{privacyPolicy}</a
        >
      </div>
    {/snippet}
  </GatedFrame>
</div>

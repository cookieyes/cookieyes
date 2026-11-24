<script lang="ts">
import { announceBanner, CY_PART } from "@cookieyes/ui";
import { useBannerVisibility } from "../hooks/useBannerVisibility.svelte.js";
import { useRegulation } from "../hooks/useRegulation.svelte.js";
import { _useRuntime } from "../hooks/useRuntime.js";
import { useTranslations } from "../hooks/useTranslations.svelte.js";
import * as Banner from "../primitives/banner/index.js";
import { useFocusTrap } from "../primitives/utils.svelte.js";
import { cardStyle, part } from "./part.js";
import type { BannerPart, CookieBannerProps } from "./types.js";

let { class: klass, style, classNames, styles }: CookieBannerProps = $props();

_useRuntime("<CookieBanner>");
const regulation = useRegulation();
const t = useTranslations();
const titleId = $props.id();
const visible = useBannerVisibility();
// Modal: Tab stays inside the banner until the visitor answers. Focus is not moved in on
// load; the first Tab from the page lands on the banner.
let card = $state<HTMLElement | null>(null);
useFocusTrap(
  () => visible.current,
  () => card,
);

// Rendered outside <Banner.Root>, unconditionally, so a later appearance (after "reset
// consent", say) is a change to an element assistive tech has tracked all along rather than
// a freshly inserted one. The delay is `announceBanner`'s; see `@cookieyes/ui` for why.
let announcement = $state("");
$effect(() => {
  if (!visible.current) {
    announcement = "";
    return;
  }
  return announceBanner(t.bannerTitle, (text) => {
    announcement = text;
  });
});

const p = (key: BannerPart, base: string) => part(classNames, styles, key, base);
const isCCPA = $derived(regulation.current === "CCPA");
</script>

<!-- A consent prompt is important enough to justify aria-live="assertive" over "polite": it is
  more consistently announced by assistive tech. -->
<span aria-live="assertive" class="cy-sr-only">{announcement}</span>
<!-- The wrapper is `display: contents` (not a style target), so its `banner` part is suppressed
  here: the visible card below owns it instead. -->
<Banner.Root class="cy-banner-wrap" data-cy-part={undefined}>
  <!-- Canonical banner element: the visible card carries the stable `data-cky-banner` hook and
    the dialog role, and (via `display: contents` on the wrapper) is the only measurable banner
    box. Named by the visible title. No `aria-live`: the sr-only announcer above is the only live
    region, and two would announce the banner twice. -->
  <div
    bind:this={card}
    class={["cy-banner", klass, classNames?.root]}
    style={cardStyle(style, styles)}
    data-cky-banner=""
    data-cy-part={CY_PART.banner.root}
    role="dialog"
    aria-modal="true"
    aria-labelledby={titleId}
  >
    <Banner.Close {...p("close", "cy-banner-close")} />
    <div class="cy-banner-text">
      <Banner.Title id={titleId} {...p("title", "cy-banner-title")} />
      <Banner.Description {...p("description", "cy-banner-description")} />
    </div>
    <Banner.Actions {...p("actions", "cy-banner-actions")}>
      {#if isCCPA}
        <Banner.DoNotSell {...p("doNotSell", "cy-btn cy-btn-do-not-sell")} />
      {:else}
        <Banner.OpenPreferences {...p("customise", "cy-btn cy-btn-outline")} />
        <Banner.RejectAll {...p("rejectAll", "cy-btn cy-btn-primary")} />
        <Banner.AcceptAll {...p("acceptAll", "cy-btn cy-btn-primary")} />
      {/if}
    </Banner.Actions>
    <div class={["cy-banner-footer", isCCPA && "cy-banner-footer--ccpa"]}>
      <Banner.Branding {...p("branding", "cy-branding")} />
    </div>
  </div>
</Banner.Root>

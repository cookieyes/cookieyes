<script lang="ts">
import { splitPoweredBy } from "@cookieyes/ui";
import type { Snippet } from "svelte";
import type { HTMLAnchorAttributes } from "svelte/elements";
import { useTranslations } from "../hooks/useTranslations.svelte.js";
import CookieYesLogo from "./CookieYesLogo.svelte";

/** The "Powered by CookieYes" link shared by the banner and both dialogs. */
let { children, ...rest }: Omit<HTMLAnchorAttributes, "children"> & { children?: Snippet } =
  $props();

const t = useTranslations();
const split = $derived(splitPoweredBy(t.poweredBy));
</script>

<!-- Neither the visible text nor the logo says the link opens a new tab. -->
<a
  href="https://www.cookieyes.com"
  target="_blank"
  rel="noopener noreferrer"
  aria-label="{t.poweredBy} ({t.opensInNewTab})"
  {...rest}
>
  {#if children}{@render children()}{:else}{split[0] ?? ""}<CookieYesLogo />{split[1] ?? ""}{/if}
</a>

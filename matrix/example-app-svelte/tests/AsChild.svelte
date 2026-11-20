<script lang="ts">
import { Banner, CookieYesProvider } from "@cookieyes/svelte";
import { config } from "../src/consent";

let { tag }: { tag: "a" | "button" } = $props();
</script>

<CookieYesProvider {config}>
  <Banner.Root>
    <Banner.AcceptAll>
      {#snippet child({ props })}
        {#if tag === "a"}
          <a {...props} href="#accept" data-testid="accept-native">Accept</a>
        {:else}
          <button {...props} data-testid="accept-native">Accept</button>
        {/if}
      {/snippet}
    </Banner.AcceptAll>
  </Banner.Root>
</CookieYesProvider>

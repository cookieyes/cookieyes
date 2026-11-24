<script lang="ts">
import { Banner, CookieYesRoot } from "@cookieyes/sveltekit";
import { config } from "../src/lib/cookieyes";

let { tag }: { tag: "a" | "button" } = $props();
</script>

<CookieYesRoot {config}>
  {#snippet ui()}
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
  {/snippet}
</CookieYesRoot>

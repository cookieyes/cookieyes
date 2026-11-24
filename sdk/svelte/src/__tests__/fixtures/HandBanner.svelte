<script lang="ts">
import { Banner } from "../../index.js";

// The banner parts composed by hand through the namespace, the way an app would.
let { variant }: { variant: "full" | "description" | "close" | "bare" } = $props();
</script>

{#if variant === "bare"}
  <Banner.Root data-cy-part={undefined} id="wrap" />
{:else}
  <Banner.Root>
    {#if variant === "full"}
      <Banner.Title />
      <Banner.Description />
      <Banner.Title id="custom">Hello</Banner.Title>
      <Banner.Actions><Banner.AcceptAll /></Banner.Actions>
      <Banner.Branding>Made by us</Banner.Branding>
    {:else if variant === "description"}
      <Banner.Description />
    {:else}
      <Banner.Close />
    {/if}
  </Banner.Root>
{/if}

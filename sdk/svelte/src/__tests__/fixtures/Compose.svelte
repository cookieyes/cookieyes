<script lang="ts">
import type { Component } from "svelte";

// Mounts several components side by side, in order.
let { parts }: { parts: Component<any>[] } = $props();
</script>

{#each parts as Part}
  <Part />
{/each}

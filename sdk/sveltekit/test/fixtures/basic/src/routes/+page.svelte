<script lang="ts">
import { browser } from "$app/environment";
import { page } from "$app/state";

// `?mismatch` renders a different element on the server and the client: the control that proves
// the hydration test would see a real mismatch.
const mismatch = page.url.searchParams.has("mismatch");
</script>

<main id="page">
  Fixture page
  {#if mismatch}
    {#if browser}<b id="control">client</b>{:else}<i id="control">server</i>{/if}
  {/if}
</main>

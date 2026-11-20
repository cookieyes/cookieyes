<script lang="ts">
// Runs `use` during component initialisation, where hooks are allowed to run.
let { use }: { use: () => void } = $props();
// svelte-ignore state_referenced_locally
use();
</script>

<div data-probe></div>

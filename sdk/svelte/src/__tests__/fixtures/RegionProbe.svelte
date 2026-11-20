<script lang="ts">
import { useRegion, useRegulation } from "../../index.js";

// Prints `useRegulation()` and reports what `useRegion()` and `useRegulation()` returned.
let { out }: { out: { region?: unknown; regulation?: unknown } } = $props();
const region = useRegion();
const regulation = useRegulation();
$effect.pre(() => {
  // svelte-ignore state_referenced_locally
  out.region = { ...region };
  out.regulation = regulation.current;
});
</script>

<span>{regulation.current}</span>

<script lang="ts">
import { useConsent } from "../../index.js";

// Records the value each time the template-tracked `hasActed` is recomputed.
let { renders }: { renders: string[] } = $props();
const consent = useConsent();
const text = $derived(String(consent.hasActed));
$effect.pre(() => {
  // svelte-ignore state_referenced_locally
  renders.push(text);
});
</script>

<span>{text}</span>

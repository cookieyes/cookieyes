<script lang="ts">
import { useConsentActions } from "../../index.js";

// Two sets of actions from one hook: one with no source and one tagged as the banner.
const plain = useConsentActions();
const banner = useConsentActions("banner");
</script>

<button onclick={plain.acceptAll}>plain</button>
<button onclick={banner.rejectAll}>banner</button>

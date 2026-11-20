<script lang="ts">
import { CY_PART } from "@cookieyes/ui";
import Action from "../Action.svelte";
import type { ActionProps } from "../types.js";

let props: ActionProps = $props();
</script>

<Action
  {...props}
  name="Banner.RejectAll"
  part={CY_PART.banner.rejectAll}
  source="banner"
  run={(actions) => actions.rejectAll}
  fallback={(t) => t.rejectAll}
/>

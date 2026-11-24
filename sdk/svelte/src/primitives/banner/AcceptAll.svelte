<script lang="ts">
import { CY_PART } from "@cookieyes/ui";
import Action from "../Action.svelte";
import type { ActionProps } from "../types.js";

let props: ActionProps = $props();
</script>

<Action
  {...props}
  name="Banner.AcceptAll"
  part={CY_PART.banner.acceptAll}
  source="banner"
  run={(actions) => actions.acceptAll}
  fallback={(t) => t.acceptAll}
/>

<script lang="ts">
import { CY_PART } from "@cookieyes/ui";
import Action from "../Action.svelte";
import type { ActionProps } from "../types.js";

let props: ActionProps = $props();
</script>

<Action
  {...props}
  name="OptOut.Cancel"
  part={CY_PART.optOut.cancel}
  run={(actions) => actions.hideOptOut}
  fallback={(t) => t.optOut.cancel}
/>

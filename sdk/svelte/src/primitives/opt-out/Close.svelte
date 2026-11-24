<script lang="ts">
import { CY_PART } from "@cookieyes/ui";
import Action from "../Action.svelte";
import type { ActionProps } from "../types.js";

let props: ActionProps = $props();
</script>

<Action
  {...props}
  name="OptOut.Close"
  part={CY_PART.optOut.close}
  run={(actions) => actions.hideOptOut}
  icon={{ size: 10 }}
  ariaLabel={(t) => t.optOutCloseLabel}
/>

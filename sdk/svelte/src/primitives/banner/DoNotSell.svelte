<script lang="ts">
import { CY_PART } from "@cookieyes/ui";
import Action from "../Action.svelte";
import type { ActionProps } from "../types.js";

let props: ActionProps = $props();
</script>

<Action
  {...props}
  name="Banner.DoNotSell"
  part={CY_PART.banner.doNotSell}
  run={(actions) => actions.showOptOut}
  fallback={(t) => t.doNotSell}
  extra={{ "aria-haspopup": "dialog" }}
/>

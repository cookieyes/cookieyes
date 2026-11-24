<script lang="ts">
import { CY_PART } from "@cookieyes/ui";
import Action from "../Action.svelte";
import type { ActionProps } from "../types.js";

let props: ActionProps = $props();
</script>

<Action
  {...props}
  name="Banner.Close"
  part={CY_PART.banner.close}
  run={(actions) => actions.dismissBanner}
  icon={{ size: 9 }}
  ariaLabel={(t) => t.bannerCloseLabel}
/>

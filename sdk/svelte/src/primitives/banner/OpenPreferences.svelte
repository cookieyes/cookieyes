<script lang="ts">
import { CY_PART } from "@cookieyes/ui";
import Action from "../Action.svelte";
import type { ActionProps } from "../types.js";

let props: ActionProps = $props();
</script>

<Action
  {...props}
  name="Banner.OpenPreferences"
  part={CY_PART.banner.customise}
  run={(actions) => actions.showPreferences}
  fallback={(t) => t.managePreferences}
  extra={{ "aria-haspopup": "dialog" }}
/>

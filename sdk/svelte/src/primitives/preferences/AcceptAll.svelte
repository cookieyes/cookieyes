<script lang="ts">
import { CY_PART } from "@cookieyes/ui";
import Action from "../Action.svelte";
import type { ActionProps } from "../types.js";

let props: ActionProps = $props();
</script>

<Action
  {...props}
  name="Preferences.AcceptAll"
  part={CY_PART.dialog.acceptAll}
  source="preferences"
  run={(actions) => actions.acceptAll}
  fallback={(t) => t.acceptAll}
/>

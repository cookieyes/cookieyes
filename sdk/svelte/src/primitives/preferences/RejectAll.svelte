<script lang="ts">
import { CY_PART } from "@cookieyes/ui";
import Action from "../Action.svelte";
import type { ActionProps } from "../types.js";

let props: ActionProps = $props();
</script>

<Action
  {...props}
  name="Preferences.RejectAll"
  part={CY_PART.dialog.rejectAll}
  source="preferences"
  run={(actions) => actions.rejectAll}
  fallback={(t) => t.rejectAll}
/>

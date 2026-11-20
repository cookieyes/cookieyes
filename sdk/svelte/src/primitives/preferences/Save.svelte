<script lang="ts">
import { CY_PART } from "@cookieyes/ui";
import Action from "../Action.svelte";
import type { ActionProps } from "../types.js";

let props: ActionProps = $props();
</script>

<Action
  {...props}
  name="Preferences.Save"
  part={CY_PART.dialog.save}
  source="preferences"
  run={(actions) => actions.save}
  fallback={(t) => t.savePreferences}
/>

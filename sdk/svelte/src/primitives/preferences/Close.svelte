<script lang="ts">
import { CY_PART } from "@cookieyes/ui";
import Action from "../Action.svelte";
import type { ActionProps } from "../types.js";

let props: ActionProps = $props();
</script>

<Action
  {...props}
  name="Preferences.Close"
  part={CY_PART.dialog.close}
  run={(actions) => actions.hidePreferences}
  icon={{ size: 12, strokeWidth: 1.8 }}
  ariaLabel={(t) => t.preferencesCloseLabel}
/>

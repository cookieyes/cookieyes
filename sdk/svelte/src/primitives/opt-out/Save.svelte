<script lang="ts">
import { CY_PART } from "@cookieyes/ui";
import Action from "../Action.svelte";
import type { ActionProps } from "../types.js";
import { useOptOutContext } from "./state.svelte.js";

let props: ActionProps = $props();

const optOut = useOptOutContext();
</script>

<Action
  {...props}
  name="OptOut.Save"
  part={CY_PART.optOut.confirm}
  source="optout"
  run={(actions) => () => {
    // The success message confirms an opt-out only; saving without one just closes.
    if (optOut.state.optedOut) {
      actions.rejectAll();
      optOut.dispatch({ type: "confirm" });
    } else {
      actions.acceptAll();
      actions.hideOptOut();
    }
  }}
  fallback={(t) => t.savePreferences}
/>

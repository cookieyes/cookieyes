<script lang="ts">
import { CY_PART } from "@cookieyes/ui";
import type { HTMLInputAttributes } from "svelte/elements";
import { _useRuntime } from "../../hooks/useRuntime.js";
import { chain } from "../utils.svelte.js";
import { useOptOutContext } from "./state.svelte.js";

let { onchange, disabled, ...rest }: Omit<HTMLInputAttributes, "type" | "checked" | "children"> =
  $props();

_useRuntime("<OptOut.Checkbox>");
const optOut = useOptOutContext();
const change = $derived(
  chain<Event>(onchange, (e) =>
    optOut.dispatch({ type: "toggle", optedOut: (e.target as HTMLInputElement).checked }),
  ),
);
</script>

<input
  type="checkbox"
  data-cy-part={CY_PART.optOut.checkbox}
  checked={optOut.state.optedOut}
  disabled={disabled ?? optOut.state.confirmed}
  onchange={change}
  {...rest}
/>

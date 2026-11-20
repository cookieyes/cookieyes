<script lang="ts">
import { _useRuntime } from "../../hooks/useRuntime.js";
import type { PartProps } from "../types.js";
import { useOptOutContext } from "./state.svelte.js";

let { children, ...rest }: PartProps = $props();

_useRuntime("<OptOut.Buttons>");
const optOut = useOptOutContext();
</script>

{#if !optOut.state.confirmed}
  <div {...rest}>{@render children?.()}</div>
{/if}

<script lang="ts">
import { _useRuntime } from "../../hooks/useRuntime.js";
import type { PartProps } from "../types.js";

let { children, ...rest }: PartProps = $props();

_useRuntime("<Preferences.Description>");
</script>

<p {...rest}>{@render children?.()}</p>

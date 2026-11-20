<script lang="ts">
import { CY_PART } from "@cookieyes/ui";
import { _useRuntime } from "../../hooks/useRuntime.js";
import type { PartProps } from "../types.js";

let { children, ...rest }: PartProps = $props();

_useRuntime("<Banner.Actions>");
</script>

<div data-cy-part={CY_PART.banner.actions} {...rest}>{@render children?.()}</div>

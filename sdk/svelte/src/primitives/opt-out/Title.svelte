<script lang="ts">
import { CY_PART } from "@cookieyes/ui";
import { _useRuntime } from "../../hooks/useRuntime.js";
import { useTranslations } from "../../hooks/useTranslations.svelte.js";
import type { PartProps } from "../types.js";
import { useOptOutContext } from "./state.svelte.js";

let { children, ...rest }: PartProps = $props();

_useRuntime("<OptOut.Title>");
const { titleId } = useOptOutContext();
const t = useTranslations();
</script>

<h2 id={titleId} data-cy-part={CY_PART.optOut.title} {...rest}>
  {#if children}{@render children()}{:else}{t.optOut.title}{/if}
</h2>

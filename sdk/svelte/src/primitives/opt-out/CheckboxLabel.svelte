<script lang="ts">
import { CY_PART } from "@cookieyes/ui";
import type { Snippet } from "svelte";
import type { HTMLLabelAttributes } from "svelte/elements";
import { _useRuntime } from "../../hooks/useRuntime.js";
import { useTranslations } from "../../hooks/useTranslations.svelte.js";

let { children, ...rest }: Omit<HTMLLabelAttributes, "children"> & { children?: Snippet } =
  $props();

_useRuntime("<OptOut.CheckboxLabel>");
const t = useTranslations();
</script>

<label data-cy-part={CY_PART.optOut.checkboxLabel} {...rest}>
  {#if children}{@render children()}{:else}{t.doNotSell}{/if}
</label>

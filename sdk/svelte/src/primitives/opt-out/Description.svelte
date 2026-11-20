<script lang="ts">
import { CY_PART } from "@cookieyes/ui";
import { _useRuntime } from "../../hooks/useRuntime.js";
import { useTranslations } from "../../hooks/useTranslations.svelte.js";
import type { PartProps } from "../types.js";

let { children, ...rest }: PartProps = $props();

_useRuntime("<OptOut.Description>");
const t = useTranslations();
</script>

<p data-cy-part={CY_PART.optOut.message} {...rest}>{#if children}{@render children()}{:else}{t.optOut.description}{/if}</p>

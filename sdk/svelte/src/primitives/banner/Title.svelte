<script lang="ts">
import { CY_PART } from "@cookieyes/ui";
import { _useRuntime } from "../../hooks/useRuntime.js";
import { useTranslations } from "../../hooks/useTranslations.svelte.js";
import type { PartProps } from "../types.js";

let { children, ...rest }: PartProps = $props();

_useRuntime("<Banner.Title>");
const t = useTranslations();
</script>

<h2 data-cy-part={CY_PART.banner.title} {...rest}>{#if children}{@render children()}{:else}{t.bannerTitle}{/if}</h2>

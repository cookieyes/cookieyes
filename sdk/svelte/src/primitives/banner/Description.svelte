<script lang="ts">
import { CY_PART } from "@cookieyes/ui";
import { useRegulation } from "../../hooks/useRegulation.svelte.js";
import { _useRuntime } from "../../hooks/useRuntime.js";
import { useTranslations } from "../../hooks/useTranslations.svelte.js";
import type { PartProps } from "../types.js";

let { children, ...rest }: PartProps = $props();

_useRuntime("<Banner.Description>");
const t = useTranslations();
const regulation = useRegulation();
</script>

<p data-cy-part={CY_PART.banner.description} {...rest}>{#if children}{@render children()}{:else}{regulation.current === "CCPA" ? t.ccpaDescription : t.bannerDescription}{/if}</p>

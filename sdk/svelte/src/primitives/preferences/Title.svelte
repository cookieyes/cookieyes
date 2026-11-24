<script lang="ts">
import { CY_PART } from "@cookieyes/ui";
import { getContext } from "svelte";
import { _useRuntime } from "../../hooks/useRuntime.js";
import { useTranslations } from "../../hooks/useTranslations.svelte.js";
import { _PREFERENCES_ROOT } from "../../keys.js";
import type { PartProps } from "../types.js";

let { children, ...rest }: PartProps = $props();

_useRuntime("<Preferences.Title>");
const root = getContext<{ titleId: string } | undefined>(_PREFERENCES_ROOT);
if (!root) {
  throw new Error(
    "[cookieyes] Preferences.* sub-components must be rendered inside <Preferences.Root>.",
  );
}
const t = useTranslations();
</script>

<h2 id={root.titleId} data-cy-part={CY_PART.dialog.title} {...rest}>
  {#if children}{@render children()}{:else}{t.preferencesTitle}{/if}
</h2>

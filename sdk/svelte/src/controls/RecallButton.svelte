<script lang="ts">
import { CY_PART, isRecallVisible } from "@cookieyes/ui";
import type { Snippet } from "svelte";
import type { HTMLButtonAttributes } from "svelte/elements";
import RevisitIcon from "../components/RevisitIcon.svelte";
import { useConsent } from "../hooks/useConsent.svelte.js";
import { useConsentActions } from "../hooks/useConsentActions.js";
import { useRegulation } from "../hooks/useRegulation.svelte.js";
import { _useRuntime } from "../hooks/useRuntime.js";
import { _useThemeConfig } from "../hooks/useThemeConfig.js";
import { _useThemeVars } from "../hooks/useThemeVars.svelte.js";
import { useTranslations } from "../hooks/useTranslations.svelte.js";
import { portal } from "../primitives/portal.js";
import { chain } from "../primitives/utils.svelte.js";

// The floating button that reopens the visitor's choices once the banner is gone. It opens
// the preferences dialog, or the opt-out dialog under CCPA. Button attributes; the children
// snippet replaces the icon.
let {
  children,
  class: klass,
  onclick,
  ...rest
}: Omit<HTMLButtonAttributes, "children"> & { children?: Snippet } = $props();

_useRuntime("<RecallButton>");
const snapshot = useConsent();
const regulation = useRegulation();
const { showPreferences, showOptOut } = useConsentActions();
const t = useTranslations();
const { theme, colorScheme } = _useThemeConfig("<RecallButton>");
let el = $state<HTMLElement | null>(null);
_useThemeVars(() => el, theme, colorScheme);

const visible = $derived(isRecallVisible(snapshot, regulation.current));
const activate = $derived(
  chain<MouseEvent>(onclick, regulation.current === "CCPA" ? showOptOut : showPreferences),
);
</script>

{#if visible}
  <button
    bind:this={el}
    type="button"
    aria-label={t.recallButtonLabel}
    aria-haspopup="dialog"
    class={klass ?? "cy-widget"}
    data-cy-part={CY_PART.recall.root}
    data-tooltip={t.recallButtonLabel}
    onclick={activate}
    {...rest}
    use:portal
  >
    {#if children}{@render children()}{:else}<RevisitIcon />{/if}
  </button>
{/if}

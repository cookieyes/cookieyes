<script lang="ts">
import { CY_PART, OPT_OUT_COUNTDOWN_SECONDS } from "@cookieyes/ui";
import SuccessIcon from "../../components/SuccessIcon.svelte";
import { _useRuntime } from "../../hooks/useRuntime.js";
import { useTranslations } from "../../hooks/useTranslations.svelte.js";
import type { PartProps } from "../types.js";
import { useOptOutContext } from "./state.svelte.js";

let { children, ...rest }: PartProps = $props();

_useRuntime("<OptOut.Success>");
const optOut = useOptOutContext();
const t = useTranslations();
let el = $state<HTMLElement | null>(null);

// The focused Save button is gone once saved. Move focus here, so the confirmation is read
// and keyboard users keep their place inside the dialog.
const confirmed = $derived(optOut.state.confirmed);
$effect(() => {
  if (confirmed) el?.focus();
});

const countdown = $derived(t.optOut.successCountdown.split("{seconds}"));
</script>

{#if optOut.state.confirmed}
  <div bind:this={el} data-cy-part={CY_PART.optOut.confirmation} role="status" tabindex="-1" {...rest}>
    <div class="cy-optout-success-inner">
      <div class="cy-optout-success-row">
        <div class="cy-optout-success-icon" aria-hidden="true"><SuccessIcon /></div>
        <div class="cy-optout-success-text">
          {t.optOut.successText}
          <!-- Screen readers get the countdown as one fixed sentence, in the same text as the
            confirmation so both are read together. The visible one below ticks every second,
            and role="status" would re-announce each tick, so it is hidden from them instead. -->
          <span class="cy-sr-only"> {countdown.join(`${OPT_OUT_COUNTDOWN_SECONDS}`)}</span>
        </div>
      </div>
      <div class="cy-optout-success-subtext-wrapper" aria-hidden="true">
        <p class="cy-optout-success-subtext">
          {countdown[0]}<span class="cy-optout-countdown">{optOut.state.secondsLeft}</span
          >{#if countdown[1]}{countdown[1]}{/if}
        </p>
      </div>
    </div>
  </div>
{/if}

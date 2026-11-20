<script lang="ts">
import { Banner } from "../../index.js";

// One `child` snippet per variant, each spreading the part's props onto its own element.
let {
  variant,
  onchildclick,
}: {
  variant: "anchor" | "button" | "prevent" | "class" | "reject";
  onchildclick?: () => void;
} = $props();
</script>

<Banner.Root>
  {#if variant === "anchor"}
    <Banner.AcceptAll>
      {#snippet child({ props })}<a {...props} href="#accept" data-testid="mine">Accept</a>{/snippet}
    </Banner.AcceptAll>
  {:else if variant === "button"}
    <Banner.AcceptAll>
      {#snippet child({ props })}
        <button {...props} data-testid="mine" onclick={(e) => { onchildclick?.(); (props.onclick as (e: Event) => void)(e); }}>Accept</button>
      {/snippet}
    </Banner.AcceptAll>
  {:else if variant === "prevent"}
    <Banner.AcceptAll
      onclick={(e: Event) => e.preventDefault()}
    >
      {#snippet child({ props })}<button {...props} data-testid="mine">Accept</button>{/snippet}
    </Banner.AcceptAll>
  {:else if variant === "class"}
    <Banner.RejectAll class="mine">
      {#snippet child({ props })}<button {...props} data-testid="mine">Reject</button>{/snippet}
    </Banner.RejectAll>
  {:else}
    <Banner.RejectAll>
      {#snippet child({ props })}<button {...props} data-testid="mine">Reject</button>{/snippet}
    </Banner.RejectAll>
  {/if}
</Banner.Root>

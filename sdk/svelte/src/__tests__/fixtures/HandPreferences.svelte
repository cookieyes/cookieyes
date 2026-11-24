<script lang="ts">
import { Preferences } from "../../index.js";

// Hands each category to the snippets so a test can see what they receive.
let { seen }: { seen: string[] } = $props();

// Writes nothing to the page: it returns the empty string.
function record(category: string, checked: boolean, disabled: boolean): string {
  seen.push(`${category}:${checked}:${disabled}`);
  return "";
}
</script>

<Preferences.Root>
  <Preferences.Title />
  <Preferences.Intro />
  <Preferences.Description>More detail</Preferences.Description>
  <Preferences.Categories>
    {#snippet children(category)}
      <Preferences.Category {category}>
        {#snippet children(slot)}
          {record(category, slot.checked, slot.disabled)}
          <button id="toggle-{category}" onclick={() => slot.toggle(!slot.checked)}>{slot.label}</button>
        {/snippet}
      </Preferences.Category>
    {/snippet}
  </Preferences.Categories>
</Preferences.Root>

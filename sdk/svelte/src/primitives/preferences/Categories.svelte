<script lang="ts">
import type { ConsentCategory } from "@cookieyes/core";
import type { Snippet } from "svelte";
import { useCategories } from "../../hooks/useCategories.js";
import { _useRuntime } from "../../hooks/useRuntime.js";
import type { PartProps } from "../types.js";

let { children, ...rest }: Omit<PartProps, "children"> & { children?: Snippet<[ConsentCategory]> } =
  $props();

_useRuntime("<Preferences.Categories>");
const categories = useCategories();
</script>

<!-- Iterates the configured taxonomy (custom list or the built-in five), in declaration order. -->
<div role="list" {...rest}>
  {#each categories.ids as category (category)}
    <div role="listitem">{@render children?.(category)}</div>
  {/each}
</div>

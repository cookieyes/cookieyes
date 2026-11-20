<script lang="ts">
import type { Snippet } from "svelte";
import { _setupProvider } from "./provider.svelte.js";
import type { CookieYesProviderProps } from "./types.js";

let { children, ...props }: CookieYesProviderProps & { children?: Snippet } = $props();

// The config is read once: the runtime is built from it, and a later change would have to
// replace the running manager.
// svelte-ignore state_referenced_locally
_setupProvider(props.config, () => props);
</script>

{@render children?.()}

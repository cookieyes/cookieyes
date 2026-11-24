<script lang="ts">
import type { ConsentCategory } from "@cookieyes/core";
import { untrack } from "svelte";
import { _useRuntime } from "../hooks/useRuntime.js";

// Registers a script that loads only once its category is consented. Renders nothing.
// Changing `id`, `src` or `category` registers it again; `onLoad` is read at that moment.
let {
  src,
  category,
  id,
  onLoad,
}: { src: string; category: ConsentCategory; id: string; onLoad?: (() => void) | undefined } =
  $props();

const runtime = _useRuntime("<GatedScript>");

// Effects run in the browser only, so the server registers nothing.
$effect(() => {
  const load = untrack(() => onLoad);
  runtime.registerScript({ id, src, category, ...(load !== undefined ? { onLoad: load } : {}) });
});
</script>

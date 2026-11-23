<script lang="ts">
import { type CookieYesConfig, CookieYesRoot } from "@cookieyes/sveltekit";

let { config }: { config: CookieYesConfig } = $props();
</script>

<CookieYesRoot {config}>
  <main>Page</main>
</CookieYesRoot>

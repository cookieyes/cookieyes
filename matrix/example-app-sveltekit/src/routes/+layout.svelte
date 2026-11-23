<script lang="ts">
import { CookieYesRoot } from "@cookieyes/sveltekit";
import { config } from "../lib/cookieyes";

let { data, children } = $props();
</script>

<CookieYesRoot {config} state={data.consent}>
  {@render children()}
</CookieYesRoot>

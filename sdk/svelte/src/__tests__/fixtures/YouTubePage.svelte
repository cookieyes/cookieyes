<script module lang="ts">
import type { ConsentSnapshot, CookieYesConfig } from "@cookieyes/core";

// One object, because the provider reuses the running runtime only for the same config object.
const config: CookieYesConfig = { mode: "cookie-only", regulation: "GDPR" };
</script>

<script lang="ts">
  import CookieYesProvider from "../../context/CookieYesProvider.svelte";
  import YouTubeEmbed from "../../controls/YouTubeEmbed.svelte";

  // A page with one YouTube embed, rendered on the server and hydrated in the test.
  let { spec }: { spec: { initialConsent?: ConsentSnapshot | null } } = $props();
</script>

<CookieYesProvider {config} initialConsent={spec.initialConsent}>
  <YouTubeEmbed videoId="jNQXAC9IVRw" title="Me at the zoo" />
</CookieYesProvider>

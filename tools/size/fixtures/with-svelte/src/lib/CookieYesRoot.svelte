<script lang="ts">
import {
  CookieBanner,
  CookiePreferences,
  CookieYesProvider,
  RecallButton,
} from "@cookieyes/svelte";
import { config } from "./cookieyes";
</script>

<CookieYesProvider {config}>
  <CookieBanner />
  <CookiePreferences />
  <RecallButton />
</CookieYesProvider>

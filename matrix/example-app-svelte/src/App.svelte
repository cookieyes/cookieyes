<script lang="ts">
import {
  type ConsentSnapshot,
  CookieBanner,
  CookiePreferences,
  CookieYesProvider,
  RecallButton,
  type Regulation,
} from "@cookieyes/svelte";
import { config } from "./consent";

let {
  regulation,
  initialConsent,
}: { regulation: Regulation; initialConsent: ConsentSnapshot | null } = $props();
</script>

<CookieYesProvider {config} {regulation} {initialConsent}>
  <CookieBanner />
  <CookiePreferences />
  <RecallButton />
</CookieYesProvider>

<script setup lang="ts">
import {
  type ConsentSnapshot,
  CookieBanner,
  CookiePreferences,
  CookieYesProvider,
  RecallButton,
  type Regulation,
} from "@cookieyes/vue";

defineProps<{ regulation: Regulation; initialConsent: ConsentSnapshot | null }>();
</script>

<template>
  <CookieYesProvider :regulation="regulation" :initial-consent="initialConsent">
    <CookieBanner />
    <CookiePreferences />
    <RecallButton />
  </CookieYesProvider>
</template>

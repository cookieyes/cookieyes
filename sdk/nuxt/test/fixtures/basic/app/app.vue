<script setup lang="ts">
// `?mismatch` renders different text on the server and the client: the control that proves the
// hydration test would see a real mismatch.
// biome-ignore lint/correctness/noUnusedVariables: read by the template, which Biome does not see.
const mismatch = useRequestURL().searchParams.has("mismatch")
  ? import.meta.server
    ? "server"
    : "client"
  : "";
</script>

<template>
  <CookieYesRoot />
  <main id="page">Fixture page <span id="control">{{ mismatch }}</span></main>
</template>

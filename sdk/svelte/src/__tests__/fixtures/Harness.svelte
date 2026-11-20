<script lang="ts">
import type { ConsentSnapshot, CookieYesConfig, RegionConfig, Regulation } from "@cookieyes/core";
import type { Component } from "svelte";
import CookieYesProvider from "../../context/CookieYesProvider.svelte";

// Mounts `component` under a provider. Everything the provider takes is passed through.
let {
  config,
  component,
  componentProps = {},
  region,
  regulation,
  initialConsent,
  forcedRegion,
}: {
  config: CookieYesConfig;
  component?: Component<any> | undefined;
  componentProps?: Record<string, unknown>;
  region?: RegionConfig | undefined;
  regulation?: Regulation | undefined;
  initialConsent?: ConsentSnapshot | null | undefined;
  forcedRegion?: string | undefined;
} = $props();
const Body = $derived(component);
</script>

<CookieYesProvider {config} {region} {regulation} {initialConsent} {forcedRegion}>
  {#if Body}<Body {...componentProps} />{/if}
</CookieYesProvider>

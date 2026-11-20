<script module lang="ts">
import type { ConsentSnapshot, CookieYesConfig } from "@cookieyes/core";

/** Plain data, so the same page renders in the server process and hydrates in the test. */
export type PageSpec = {
  regulation?: "GDPR" | "CCPA" | "DEFAULT";
  /** A region the detector reports; the map sends US-CA to CCPA and DE to GDPR. */
  region?: string;
  parts: ("banner" | "preferences" | "optout" | "recall" | "reload" | "state")[];
  initialConsent?: ConsentSnapshot | null;
  forcedRegion?: string;
};

const configs = new Map<string, CookieYesConfig>();

// One object per spec, because the provider reuses the running runtime only for the same
// config object, as a server module-level config does.
function configFor(spec: PageSpec): CookieYesConfig {
  const key = JSON.stringify([spec.regulation, spec.region]);
  let config = configs.get(key);
  if (!config) {
    config = {
      mode: "cookie-only",
      ...(spec.region !== undefined
        ? { region: { detect: () => spec.region, map: { "US-CA": "CCPA", DE: "GDPR" } } }
        : { regulation: spec.regulation ?? "GDPR" }),
    } as CookieYesConfig;
    configs.set(key, config);
  }
  return config;
}
</script>

<script lang="ts">
  import CookieYesProvider from "../../context/CookieYesProvider.svelte";
  import RecallButton from "../../controls/RecallButton.svelte";
  import CookieBanner from "../../presets/CookieBanner.svelte";
  import CookieOptOut from "../../presets/CookieOptOut.svelte";
  import CookiePreferences from "../../presets/CookiePreferences.svelte";
  import ReloadNotice from "../../presets/ReloadNotice.svelte";
  import StateProbe from "./StateProbe.svelte";

  let { spec }: { spec: PageSpec } = $props();
  // svelte-ignore state_referenced_locally
  const config = configFor(spec);
</script>

<CookieYesProvider {config} initialConsent={spec.initialConsent} forcedRegion={spec.forcedRegion}>
  {#each spec.parts as part (part)}
    {#if part === "banner"}<CookieBanner />
    {:else if part === "preferences"}<CookiePreferences />
    {:else if part === "optout"}<CookieOptOut />
    {:else if part === "recall"}<RecallButton />
    {:else if part === "reload"}<ReloadNotice />
    {:else}<StateProbe />{/if}
  {/each}
</CookieYesProvider>

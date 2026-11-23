<script module lang="ts">
import type { CookieYesConfig } from "@cookieyes/svelte";
import type { CookieYesRequestState } from "../../server-consent.js";

/** Plain data, so the same page renders in the server process and hydrates in the test. */
export type PageSpec = {
  /** A fixed regulation. Without it the config detects the region, see `configFor`. */
  regulation?: "GDPR" | "CCPA" | "DEFAULT";
  state?: CookieYesRequestState;
  content?: boolean;
  customUi?: boolean;
};

const configs = new Map<string, CookieYesConfig>();

// One object per kind of page, as a module-level config in a real app is, because the provider
// reuses the running runtime only for the same config object. Without a fixed regulation the
// config maps California to CCPA and detects it in the browser, which a request's region replaces.
export function configFor(spec: PageSpec): CookieYesConfig {
  const key = spec.regulation ?? "region";
  let config = configs.get(key);
  if (!config) {
    config = {
      mode: "cookie-only",
      ...(spec.regulation
        ? { regulation: spec.regulation }
        : { region: { detect: () => "US-CA", map: { "US-CA": "CCPA", DE: "GDPR" } } }),
    } as CookieYesConfig;
    configs.set(key, config);
  }
  return config;
}
</script>

<script lang="ts">
  import CookieYesRoot from "../../CookieYesRoot.svelte";

  let { spec }: { spec: PageSpec } = $props();
  // svelte-ignore state_referenced_locally
  const config = configFor(spec);
</script>

{#snippet page()}<main id="page">Page content</main>{/snippet}
{#snippet ui()}<p id="custom">Custom UI</p>{/snippet}

<CookieYesRoot
  {config}
  state={spec.state}
  children={spec.content ? page : undefined}
  ui={spec.customUi ? ui : undefined}
/>

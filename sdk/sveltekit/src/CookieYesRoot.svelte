<script lang="ts">
import {
  CookieBanner,
  CookieOptOut,
  CookiePreferences,
  type CookieYesConfig,
  CookieYesProvider,
  RecallButton,
} from "@cookieyes/svelte";
import { onMount, type Snippet } from "svelte";
import {
  _canBeCcpa,
  _emptyRequestState,
  _withRequestRegion,
  type CookieYesRequestState,
} from "./server-consent.js";
import { _isServerFirst } from "./server-first.js";

type Props = {
  /** The same config `cookieyesHandle` was given, imported from one shared module. */
  config: CookieYesConfig;
  /** `data.consent` from `loadConsent`. Without it the page renders for a visitor nobody read. */
  state?: CookieYesRequestState | undefined;
  /** The page content, rendered inside the provider after the consent UI, so hooks work in it. */
  children?: Snippet | undefined;
  /** Replaces the stock banner, preferences dialog, opt-out dialog and recall button. */
  ui?: Snippet | undefined;
};

// `state` is renamed because a local called `state` collides with the `$state` rune.
let { config, state: requestState, children, ui }: Props = $props();

// svelte-ignore state_referenced_locally
if (!config) {
  throw new Error(
    "[cookieyes] <CookieYesRoot> needs a `config` prop: the same object cookieyesHandle() takes, imported from one shared module.",
  );
}

// The config is read once, as the provider reads it: the runtime is built from it, and a changed
// object would have to replace the running manager. The server's runtime is shared by every
// request, so only the browser's runtime takes this visitor's region; on the server the provider
// below renders it per request.
// svelte-ignore state_referenced_locally
const runtimeConfig =
  typeof window === "undefined"
    ? config
    : _withRequestRegion(config, requestState ?? _emptyRequestState());
// svelte-ignore state_referenced_locally
const canBeCcpa = _canBeCcpa(config);

const request = $derived(requestState ?? _emptyRequestState());

// When the server read the request, its geo headers are the only source of the region, on both
// sides, so the first client render resolves the regulation the server rendered and the runtime
// runs under. A page the server did not personalise (prerendered, or rendered without a state)
// renders the strictest regulation on the server and while hydrating, and the configured
// detector, which may read browser-only signals, takes over once mounted.
let live = $state(!_isServerFirst());
onMount(() => {
  live = true;
});

const region = $derived.by(() => {
  // svelte-ignore state_referenced_locally
  const configured = config.region;
  if (!configured) return undefined;
  if (request.read) return { ...configured, detect: () => request.region };
  return live ? configured : { ...configured, detect: () => undefined };
});
</script>

<CookieYesProvider
  config={runtimeConfig}
  initialConsent={request.initialConsent}
  {region}
  forcedRegion={request.forcedRegion}
>
  {#if ui}
    {@render ui()}
  {:else}
    <CookieBanner />
    <CookiePreferences />
    {#if canBeCcpa}<CookieOptOut />{/if}
    <RecallButton />
  {/if}
  {@render children?.()}
</CookieYesProvider>

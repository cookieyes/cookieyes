<script lang="ts">
import { CY_PART } from "@cookieyes/ui";
import type { Snippet } from "svelte";
import type { HTMLAnchorAttributes } from "svelte/elements";
import BrandingLink from "../../components/BrandingLink.svelte";
import { _useRuntime } from "../../hooks/useRuntime.js";

let props: Omit<HTMLAnchorAttributes, "children"> & { children?: Snippet } = $props();

_useRuntime("<Preferences.Branding>");
</script>

<BrandingLink data-cy-part={CY_PART.dialog.branding} {...props} />

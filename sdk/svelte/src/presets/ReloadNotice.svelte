<script lang="ts">
import { CY_PART } from "@cookieyes/ui";
import { useReloadNotice } from "../hooks/useReloadNotice.svelte.js";
import { _useRuntime } from "../hooks/useRuntime.js";
import { _useThemeConfig } from "../hooks/useThemeConfig.js";
import { _useThemeVars } from "../hooks/useThemeVars.svelte.js";
import { useTranslations } from "../hooks/useTranslations.svelte.js";

// Non-intrusive, dismissible notice shown only when a revoked tool has no clean runtime stop
// and can be fully applied only by reloading. It never reloads on its own: the visitor stays
// in control. Wording comes from translations (`reloadNotice.*`), so it is customisable
// through `i18n`. Announced to screen readers via `role="alert"`. Reachable by keyboard; once
// dismissed it does not reappear until a genuinely new revoke needs a reload.
_useRuntime("<ReloadNotice>");
const notice = useReloadNotice();
const t = useTranslations();
const { theme, colorScheme } = _useThemeConfig("<ReloadNotice>");
let el = $state<HTMLElement | null>(null);
_useThemeVars(() => el, theme, colorScheme);
</script>

{#if notice.required}
  <div bind:this={el} class="cy-reload-notice" role="alert" data-cy-part={CY_PART.reloadNotice.root}>
    <span class="cy-reload-notice-text" data-cy-part={CY_PART.reloadNotice.message}
      >{t.reloadNotice.message}</span
    >
    <div class="cy-reload-notice-actions">
      <button
        type="button"
        class="cy-btn cy-btn-primary cy-reload-notice-reload"
        data-cy-part={CY_PART.reloadNotice.reload}
        onclick={() => {
          if (typeof window !== "undefined") window.location.reload();
        }}>{t.reloadNotice.reloadButton}</button
      >
      <button
        type="button"
        class="cy-btn cy-btn-outline cy-reload-notice-dismiss"
        data-cy-part={CY_PART.reloadNotice.dismiss}
        onclick={notice.dismiss}>{t.reloadNotice.dismissButton}</button
      >
    </div>
  </div>
{/if}

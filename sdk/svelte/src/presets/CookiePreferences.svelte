<script lang="ts">
import { CY_PART, CY_STATE } from "@cookieyes/ui";
import { _useRuntime } from "../hooks/useRuntime.js";
import { useTranslations } from "../hooks/useTranslations.svelte.js";
import * as Preferences from "../primitives/preferences/index.js";
import { cardStyle, part } from "./part.js";
import type { CookiePreferencesProps, DialogPart } from "./types.js";

let { class: klass, style, classNames, styles }: CookiePreferencesProps = $props();

_useRuntime("<CookiePreferences>");
const t = useTranslations();

const p = (key: DialogPart, base: string) => part(classNames, styles, key, base);
</script>

<Preferences.Root {...p("overlay", "cy-dialog-overlay")}>
  <div
    class={["cy-dialog", klass, classNames?.root]}
    style={cardStyle(style, styles)}
    data-cy-part={CY_PART.dialog.root}
  >
    <div class="cy-dialog-header">
      <Preferences.Title {...p("title", "cy-dialog-title")} />
      <Preferences.Close {...p("close", "cy-dialog-close")} />
    </div>
    <div class="cy-dialog-body">
      <div class="cy-dialog-content-intro">
        <Preferences.Intro {...p("intro", "cy-dialog-desc")} />
      </div>
      <Preferences.Categories class="cy-accordion-wrapper">
        {#snippet children(category)}
          <Preferences.Category {category} {...p("category", "cy-accordion")}>
            {#snippet children({ label, description, checked, disabled, toggle })}
              <div class="cy-accordion-item">
                <div class="cy-accordion-header-wrapper">
                  <div class="cy-accordion-header">
                    <span
                      {...p("categoryLabel", "cy-accordion-btn")}
                      data-cy-part={CY_PART.dialog.categoryLabel}>{label}</span
                    >
                    {#if disabled}
                      <span class="cy-always-active">{t.alwaysActive}</span>
                    {:else}
                      <label
                        {...p("toggle", "cy-toggle")}
                        data-cy-part={CY_PART.dialog.toggle}
                        data-cy-state={checked ? CY_STATE.on : CY_STATE.off}
                      >
                        <input
                          type="checkbox"
                          role="switch"
                          {checked}
                          aria-checked={checked}
                          aria-label={label}
                          onchange={(e) => toggle(e.currentTarget.checked)}
                        />
                        <span class="cy-toggle-track" aria-hidden="true"
                          ><span class="cy-toggle-thumb"></span></span
                        >
                      </label>
                    {/if}
                  </div>
                  <div class="cy-accordion-header-des">
                    <p
                      {...p("categoryDescription", "")}
                      data-cy-part={CY_PART.dialog.categoryDescription}
                    >
                      {description}
                    </p>
                  </div>
                </div>
              </div>
            {/snippet}
          </Preferences.Category>
        {/snippet}
      </Preferences.Categories>
    </div>
    <div class="cy-dialog-footer">
      <span class="cy-dialog-footer-shadow" aria-hidden="true"></span>
      <div class="cy-dialog-footer-actions">
        <Preferences.RejectAll {...p("rejectAll", "cy-btn cy-btn-primary")} />
        <Preferences.Save {...p("save", "cy-btn cy-btn-primary")} />
        <Preferences.AcceptAll {...p("acceptAll", "cy-btn cy-btn-primary")} />
      </div>
      <Preferences.Branding {...p("branding", "cy-branding")} />
    </div>
  </div>
</Preferences.Root>

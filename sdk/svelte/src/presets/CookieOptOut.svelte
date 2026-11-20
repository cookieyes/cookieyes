<script lang="ts">
import { _useRuntime } from "../hooks/useRuntime.js";
import * as OptOut from "../primitives/opt-out/index.js";
import { cardStyle, part } from "./part.js";
import type { CookieOptOutProps, OptOutPart } from "./types.js";

let { class: klass, style, classNames, styles }: CookieOptOutProps = $props();

_useRuntime("<CookieOptOut>");
// Generated, so two opt-out dialogs on one page never share an id.
const checkboxId = $props.id();

const p = (key: OptOutPart, base: string) => part(classNames, styles, key, base);
</script>

<OptOut.Root class="cy-dialog-overlay">
  <div
    class={["cy-dialog", "cy-optout-dialog", klass, classNames?.root]}
    style={cardStyle(style, styles)}
  >
    <div class="cy-dialog-header">
      <OptOut.Title {...p("title", "cy-dialog-title")} />
      <OptOut.Close {...p("close", "cy-dialog-close")} />
    </div>
    <div class="cy-dialog-body">
      <div class="cy-dialog-content-intro">
        <OptOut.Description {...p("message", "cy-dialog-desc")} />
      </div>
      <hr class="cy-separator" />
      <div class="cy-optout-checkbox-wrapper">
        <OptOut.Checkbox id={checkboxId} {...p("checkbox", "cy-optout-checkbox")} />
        <OptOut.CheckboxLabel for={checkboxId} {...p("checkboxLabel", "cy-optout-checkbox-label")} />
      </div>
    </div>
    <div class="cy-optout-footer">
      <div class="cy-optout-action-area">
        <OptOut.Buttons class="cy-optout-btn-wrapper">
          <OptOut.Cancel {...p("cancel", "cy-btn cy-btn-cancel")} />
          <OptOut.Save {...p("confirm", "cy-btn cy-btn-confirm")} />
        </OptOut.Buttons>
        <OptOut.Success {...p("confirmation", "cy-optout-success")} />
      </div>
      <div class="cy-optout-powered-by">
        <OptOut.Branding {...p("branding", "cy-branding")} />
      </div>
    </div>
  </div>
</OptOut.Root>

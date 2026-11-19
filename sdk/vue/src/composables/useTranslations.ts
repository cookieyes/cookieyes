import type { TranslationMap } from "@cookieyes/core";
import { type ComputedRef, computed } from "vue";
import { _useRuntime } from "./useRuntime.js";

/**
 * Text for the active language, English filling any gaps. Updates when the language is switched
 * through `useLanguage()`. Not gated on hydration: the language does not depend on the visitor's
 * stored consent, so server and client agree.
 */
export function useTranslations(): ComputedRef<TranslationMap> {
  const runtime = _useRuntime("useTranslations");
  return computed(() => {
    // The snapshot is rebuilt on every language switch, which is what invalidates this.
    runtime.state.value;
    return runtime.translations;
  });
}

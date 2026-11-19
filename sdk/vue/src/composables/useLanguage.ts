import type { TextDirection } from "@cookieyes/core";
import { type ComputedRef, computed } from "vue";
import { _useRuntime } from "./useRuntime.js";

export type UseLanguageResult = {
  /** Active language tag, for example "en" or "fr". */
  language: ComputedRef<string>;
  /** Reading direction of the active language, for laying out a custom UI. */
  direction: ComputedRef<TextDirection>;
  /** Languages currently available to switch to without loading. */
  languages: ComputedRef<string[]>;
  /**
   * Switch language live (no reload). A language that is not loaded yet is fetched through
   * `i18n.loadLanguage`; the promise resolves once it is applied.
   */
  setLanguage: (tag: string) => Promise<void>;
};

/** The active language, its reading direction and a live language switcher. */
export function useLanguage(): UseLanguageResult {
  const runtime = _useRuntime("useLanguage");
  const info = computed(() => {
    // The snapshot is rebuilt on every language switch, which is what invalidates this.
    runtime.state.value;
    return runtime.getLanguageInfo();
  });
  return {
    language: computed(() => info.value.language),
    direction: computed(() => info.value.direction),
    languages: computed(() => info.value.languages),
    setLanguage: runtime.setLanguage,
  };
}

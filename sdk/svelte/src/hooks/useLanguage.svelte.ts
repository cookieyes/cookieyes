import type { TextDirection } from "@cookieyes/core";
import { _useContext } from "./useRuntime.js";
import { _subscribeTo } from "./useSnapshot.svelte.js";

/**
 * What `useLanguage()` returns. The reading fields are getters, so each read gives the language
 * in effect at that moment, and a template that reads them updates after `setLanguage`.
 */
export type UseLanguageResult = {
  /** Active language tag, for example "en" or "fr". */
  readonly language: string;
  /** Reading direction of the active language, for laying out a custom UI. */
  readonly direction: TextDirection;
  /** Languages currently available to switch to without loading. */
  readonly languages: string[];
  /**
   * Switch language live (no reload). A language that is not loaded yet is fetched through
   * `i18n.loadLanguage`; the promise resolves once it is applied.
   */
  setLanguage: (tag: string) => Promise<void>;
};

/** The active language, its reading direction and a live language switcher. */
export function useLanguage(): UseLanguageResult {
  const context = _useContext("useLanguage");
  const subscribe = _subscribeTo(context);
  const info = () => {
    // The snapshot is rebuilt on every language switch, which is what notifies this.
    subscribe();
    return context.runtime.getLanguageInfo();
  };
  return {
    get language() {
      return info().language;
    },
    get direction() {
      return info().direction;
    },
    get languages() {
      return info().languages;
    },
    setLanguage: context.runtime.setLanguage,
  };
}

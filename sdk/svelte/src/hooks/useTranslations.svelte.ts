import type { TranslationMap } from "@cookieyes/core";
import { _view } from "./reactive.svelte.js";
import { _useContext } from "./useRuntime.js";
import { _subscribeTo } from "./useSnapshot.svelte.js";

/**
 * Text for the active language, English filling any gaps. Updates when the language is switched
 * through `useLanguage()`. Not gated on hydration: the language does not depend on the visitor's
 * stored consent, so server and client agree.
 */
export function useTranslations(): TranslationMap {
  const context = _useContext("useTranslations");
  const subscribe = _subscribeTo(context);
  return _view(() => {
    // The snapshot is rebuilt on every language switch, which is what notifies this.
    subscribe();
    return context.runtime.translations;
  });
}

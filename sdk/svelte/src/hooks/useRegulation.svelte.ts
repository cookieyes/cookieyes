import type { Regulation } from "@cookieyes/core";
import { _current, type Reactive } from "./reactive.svelte.js";
import { _useContext } from "./useRuntime.js";

/**
 * The regulation in effect. The `<CookieYesProvider>` above the component resolves it per
 * request, so the server renders the correct banner.
 */
export function useRegulation(): Reactive<Regulation> {
  const { region } = _useContext("useRegulation");
  return _current(() => region().regulation);
}

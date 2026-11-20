import {
  initialOptOutState,
  type OptOutEvent,
  type OptOutState,
  optOutReducer,
} from "@cookieyes/ui";
import { getContext, untrack } from "svelte";
import { _OPT_OUT_ROOT } from "../../keys.js";

/** @internal What `OptOut.Root` shares with its parts. */
export type OptOutContext = {
  readonly state: OptOutState;
  dispatch: (event: OptOutEvent) => void;
  /** Shared so the dialog can be named by its own visible heading. */
  titleId: string;
};

/** @internal The reducer state behind a dialog, as a rune the context reads through a getter. */
export function _createOptOutState(
  categories: Record<string, boolean>,
  titleId: string,
): OptOutContext {
  let state = $state(initialOptOutState(categories));
  return {
    get state() {
      return state;
    },
    // Reading the current state untracked: a dispatch from inside an effect must not make that
    // effect depend on the state it is changing.
    dispatch: (event) => {
      state = optOutReducer(
        untrack(() => state),
        event,
      );
    },
    titleId,
  };
}

/** @internal The dialog's context, or the error a part outside `OptOut.Root` gets. */
export function useOptOutContext(): OptOutContext {
  const ctx = getContext<OptOutContext | undefined>(_OPT_OUT_ROOT);
  if (!ctx) {
    throw new Error("[cookieyes] OptOut.* sub-components must be rendered inside <OptOut.Root>.");
  }
  return ctx;
}

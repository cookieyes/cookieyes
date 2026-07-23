import type {
  ConsentCategory,
  ConsentEventListener,
  ConsentEventOptions,
  ConsentEventPayload,
  ConsentEventType,
} from "./types.js";

export type ConsentEmitter = {
  /**
   * Listen for consent events. `"save"` fires on every saved decision (even an
   * unchanged re-confirm); `"change"` fires only when a category actually
   * differs. The listener fires once immediately with the current state
   * (`isInitial: true`) so a late listener isn't blind to earlier choices.
   * Pass `{ category }` to only be called when that one category changes.
   * Returns an unsubscribe function.
   */
  on: (
    type: ConsentEventType,
    listener: ConsentEventListener,
    options?: ConsentEventOptions,
  ) => () => void;
  /** Feed in the committed categories after a save; the emitter fans out events. */
  push: (categories: Record<string, boolean>) => void;
};

type Registration = { listener: ConsentEventListener; category?: ConsentCategory };

/**
 * The consent event fan-out, shared by the core and React runtimes so both
 * behave identically. `getCommitted` returns the consent currently in effect,
 * used for the immediate replay a new listener receives.
 */
export function createConsentEmitter(getCommitted: () => Record<string, boolean>): ConsentEmitter {
  const listeners: Record<ConsentEventType, Set<Registration>> = {
    save: new Set(),
    change: new Set(),
  };
  // Committed categories at the last push — the baseline for diffing changes.
  let last: Record<string, boolean> = { ...getCommitted() };

  function deliver(reg: Registration, type: ConsentEventType, payload: ConsentEventPayload): void {
    try {
      reg.listener(payload);
    } catch (err) {
      // One listener throwing must never stop the others (Story 5).
      if (typeof console !== "undefined") {
        console.error(
          `[cookieyes] a consent "${type}" listener threw; others are unaffected:`,
          err,
        );
      }
    }
  }

  function emit(type: ConsentEventType, payload: ConsentEventPayload): void {
    // Copy first so a listener that unsubscribes (or subscribes) while firing
    // can't corrupt the loop.
    for (const reg of [...listeners[type]]) {
      if (reg.category && !payload.changedCategories.includes(reg.category)) continue;
      deliver(reg, type, payload);
    }
  }

  return {
    on(type, listener, options) {
      const reg: Registration = options?.category
        ? { listener, category: options.category }
        : { listener };
      listeners[type].add(reg);
      // Replay current state immediately (Story 4). isInitial marks it as the
      // replay, not a live action; changedCategories is empty because nothing
      // changed — the current values live in `categories`.
      deliver(reg, type, {
        categories: { ...getCommitted() },
        changedCategories: [],
        isInitial: true,
      });
      return () => {
        listeners[type].delete(reg);
      };
    },

    push(categories) {
      const next = { ...categories };
      const changedCategories: ConsentCategory[] = [];
      for (const id of Object.keys(next) as ConsentCategory[]) {
        if (last[id] !== next[id]) changedCategories.push(id);
      }
      last = next;
      // "save" always fires; "change" only when something genuinely differed.
      emit("save", { categories: next, changedCategories, isInitial: false });
      if (changedCategories.length > 0) {
        emit("change", { categories: next, changedCategories, isInitial: false });
      }
    },
  };
}

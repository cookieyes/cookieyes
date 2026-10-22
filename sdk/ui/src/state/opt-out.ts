/** How long the opt-out confirmation stays before the dialog closes itself. */
export const OPT_OUT_COUNTDOWN_SECONDS = 10;

/** The opt-out dialog's own state, separate from the consent it records. */
export type OptOutState = {
  /** Whether the "Do Not Sell" box is ticked. */
  optedOut: boolean;
  /** Set once an opt-out is saved: the confirmation replaces the buttons. */
  confirmed: boolean;
  /** Seconds until the confirmed dialog closes itself. */
  secondsLeft: number;
};

/** What can happen to the opt-out dialog. */
export type OptOutEvent =
  | { type: "open"; categories: Record<string, boolean> }
  | { type: "toggle"; optedOut: boolean }
  | { type: "confirm" }
  | { type: "tick"; secondsLeft: number };

/**
 * The state the dialog opens in. The box starts ticked when analytics is not
 * granted, which is how the dialog reads "already opted out".
 */
export function initialOptOutState(categories: Record<string, boolean>): OptOutState {
  return {
    optedOut: categories.analytics !== true,
    confirmed: false,
    secondsLeft: OPT_OUT_COUNTDOWN_SECONDS,
  };
}

/**
 * The allowed changes. Once confirmed, the box is locked: the opt-out is
 * already recorded and only the countdown moves.
 *
 * Saving without ticking the box records an opt-in and closes the dialog at
 * once, with no confirmation; the confirmation is for an opt-out only. That
 * branch never reaches this reducer, because nothing about the dialog's own
 * state changes before it closes.
 */
export function optOutReducer(state: OptOutState, event: OptOutEvent): OptOutState {
  switch (event.type) {
    case "open":
      return initialOptOutState(event.categories);
    case "toggle":
      return state.confirmed ? state : { ...state, optedOut: event.optedOut };
    case "confirm":
      return { ...state, confirmed: true, secondsLeft: OPT_OUT_COUNTDOWN_SECONDS };
    case "tick":
      return { ...state, secondsLeft: event.secondsLeft };
  }
}

/**
 * Counts the confirmation down once a second and calls `onDone` at zero. The
 * dialog is closed from the timer, not inside a state update, so the recall
 * button is already back on the page when focus is handed to it.
 */
export function startOptOutCountdown(
  onTick: (secondsLeft: number) => void,
  onDone: () => void,
): () => void {
  let left = OPT_OUT_COUNTDOWN_SECONDS;
  const id = setInterval(() => {
    left -= 1;
    onTick(left);
    if (!left) {
      clearInterval(id);
      onDone();
    }
  }, 1000);
  return () => clearInterval(id);
}

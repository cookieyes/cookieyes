"use client";

import { useConsent } from "@cookieyes/react";
import { useRef } from "react";
import { DEMO_SCRIPTS, type LogEvent } from "./playground-config";

type Snapshot = ReturnType<typeof useConsent>;
type Log = (level: LogEvent["level"], message: string, meta?: string) => void;

/** Pads so the labels after `script.run` and `script.hold` line up in the log. */
const RUN = "script.run  ";
const HOLD = "script.hold ";

/** Why the visitor's decision looks the way it does, in the design's wording. */
function storeReason(
  committed: Record<string, boolean>,
  optional: string[],
  fromOptOut: boolean,
): string {
  if (fromOptOut) return "opt-out confirmed";
  if (optional.every((id) => committed[id])) return "accepted all";
  if (optional.every((id) => !committed[id])) return "rejected all";
  return "saved choices";
}

/**
 * Turns real SDK state into the console's event stream.
 *
 * Renders nothing. Everything it reports is a transition it actually watched on the
 * snapshot — a dialog opening, a toggle moving, consent being committed — so no line
 * claims something the runtime did not do. Script lines are the exception in the other
 * direction: `run` is written by the script's own load callback in PreviewApp, never here.
 */
export function ConsentObserver({ categories, log }: { categories: string[]; log: Log }) {
  const snapshot = useConsent();
  const previous = useRef<Snapshot | null>(null);
  const before = previous.current;
  previous.current = snapshot;

  if (before) {
    if (!before.isPreferencesOpen && snapshot.isPreferencesOpen) log("info", "preferences.open");
    if (!before.isOptOutOpen && snapshot.isOptOutOpen) log("info", "optOut.open");

    const wasOpen = before.isPreferencesOpen || before.isOptOutOpen;
    const isOpen = snapshot.isPreferencesOpen || snapshot.isOptOutOpen;
    const decided =
      categories.some(
        (id) => before.committedCategories[id] !== snapshot.committedCategories[id],
      ) ||
      (!before.hasActed && snapshot.hasActed);

    // Only a close that decided nothing. Saving closes the dialog as well, and that is
    // reported by the consent lines below instead.
    if (wasOpen && !isOpen && !decided && snapshot.hasActed) log("info", "dialog.close");

    // A banner that goes away without a decision was dismissed, not answered — worth
    // saying, because nothing was stored and every gated tag is still held.
    if (!snapshot.hasActed && wasOpen && !isOpen) {
      log("info", "banner.dismiss", "no decision recorded, tags stay held");
    }

    // Live categories move as the dialog's switches move; committed ones only on a decision.
    if (isOpen) {
      for (const id of categories) {
        if (before.categories[id] !== snapshot.categories[id]) {
          log("info", "preference.toggle", `${id} ${snapshot.categories[id] ? "on" : "off"}`);
        }
      }
    }

    if (decided) {
      reportConsent(
        snapshot,
        categories,
        log,
        storeReason(
          snapshot.committedCategories,
          categories.filter((id) => id !== "necessary"),
          before.isOptOutOpen,
        ),
      );
    }
  }

  return null;
}

/** The `consent.change` line and the held scripts underneath it, as the design orders them. */
export function reportConsent(
  snapshot: Pick<Snapshot, "committedCategories">,
  categories: string[],
  log: Log,
  reason: string | null,
): void {
  const granted = categories.filter((id) => snapshot.committedCategories[id]);
  log("info", "consent.change", granted.join(", ") || "necessary only");

  for (const script of DEMO_SCRIPTS) {
    const known = categories.includes(script.category);
    if (known && snapshot.committedCategories[script.category]) continue; // its own onLoad reports it
    log(
      "blocked",
      HOLD + script.label,
      known ? script.category : `${script.category} (no such category)`,
    );
  }

  // Only once a decision exists. On first load nothing has been stored, so saying so would
  // be reporting an event that did not happen.
  if (reason) log("info", "consent.store", reason);
}

export { RUN };

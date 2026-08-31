"use client";

import { useEffect } from "react";

/** How long the button shows "Copied" before returning to its original label. */
const COPIED_LABEL_DURATION_MS = 1600;

/** Selector the design puts on the button beside each install command. */
const COPY_BUTTON_SELECTOR = '[aria-label="Copy command"]';

/**
 * Makes the "Copy" buttons beside the install commands work.
 *
 * The design binds these through its own template runtime, which the ported markup does
 * not carry. Attaching one delegated listener to the page keeps the ported section files
 * untouched, so they can be regenerated from the design file without losing behaviour.
 *
 * Renders nothing.
 */
export function InstallCommandCopy() {
  useEffect(() => {
    const pageRoot = document.querySelector(".cy-page");
    if (!pageRoot) return;

    /** Reads the command sitting next to the button that was clicked. */
    function readCommand(copyButton: HTMLElement): string | undefined {
      const commandRow = copyButton.parentElement;
      return commandRow?.querySelector("code, pre, span")?.textContent?.trim();
    }

    /** Swaps the button's label to "Copied", then restores it. */
    function confirmOnButton(copyButton: HTMLElement): void {
      const labelElement = copyButton.querySelector("span:last-of-type");
      if (!labelElement) return;
      const originalLabel = labelElement.textContent;
      labelElement.textContent = "Copied";
      window.setTimeout(() => {
        labelElement.textContent = originalLabel;
      }, COPIED_LABEL_DURATION_MS);
    }

    function handleClick(event: Event): void {
      const clickedElement = event.target as HTMLElement | null;
      const copyButton = clickedElement?.closest<HTMLElement>(COPY_BUTTON_SELECTOR);
      if (!copyButton) return;

      const command = readCommand(copyButton);
      if (!command) return;

      void navigator.clipboard?.writeText(command).then(() => confirmOnButton(copyButton));
    }

    pageRoot.addEventListener("click", handleClick);
    return () => pageRoot.removeEventListener("click", handleClick);
  }, []);

  return null;
}

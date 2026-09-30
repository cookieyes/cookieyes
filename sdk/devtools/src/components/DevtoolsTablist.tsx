"use client";

import type { KeyboardEvent } from "react";
import { TAB_IDS, TAB_LABELS, type TabId } from "../types.js";
import { Icon } from "./Icon.js";

export type DevtoolsTablistProps = {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  panelId: string;
  /** Small count badges (e.g. blocked requests); zero hides the badge. */
  counts?: Partial<Record<TabId, number>> | undefined;
};

/**
 * `role="tablist"` with one `role="tab"` per {@link TabId}. Arrow-key
 * navigation (Left/Right moves focus and selects, wrapping at the ends;
 * Home/End jump to first/last) per the WAI-ARIA tabs pattern. Roving
 * tabindex: only the active tab is in the natural tab order.
 */
export function DevtoolsTablist({ activeTab, onTabChange, panelId, counts }: DevtoolsTablistProps) {
  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    // Navigate relative to whichever tab currently has DOM focus (not the
    // "selected" tab in React state) — the two can diverge, and arrow-key
    // navigation is a focus-following interaction per the WAI-ARIA tabs
    // pattern, not a re-application of the last selection.
    const focusedId = (document.activeElement as HTMLElement | null)?.getAttribute("data-cyd-part");
    const focusedTab = focusedId?.startsWith("tab-") ? focusedId.slice("tab-".length) : undefined;
    const currentIndex = TAB_IDS.indexOf((focusedTab as (typeof TAB_IDS)[number]) ?? activeTab);
    let nextIndex: number | null = null;
    if (event.key === "ArrowRight") nextIndex = (currentIndex + 1) % TAB_IDS.length;
    else if (event.key === "ArrowLeft") {
      nextIndex = (currentIndex - 1 + TAB_IDS.length) % TAB_IDS.length;
    } else if (event.key === "Home") nextIndex = 0;
    else if (event.key === "End") nextIndex = TAB_IDS.length - 1;

    if (nextIndex === null) return;
    event.preventDefault();
    const nextTab = TAB_IDS[nextIndex];
    if (!nextTab) return;
    onTabChange(nextTab);
    const nextEl = event.currentTarget.querySelector<HTMLElement>(
      `[data-cyd-part="tab-${nextTab}"]`,
    );
    nextEl?.focus();
  }

  return (
    <div
      className="cyd-tablist"
      role="tablist"
      aria-label="CookieYes devtools"
      data-cyd-part="tablist"
      onKeyDown={handleKeyDown}
    >
      {TAB_IDS.map((tab) => (
        <button
          key={tab}
          type="button"
          role="tab"
          id={`cyd-tab-${tab}`}
          className={`cyd-tab${tab === activeTab ? " cyd-tab-active" : ""}`}
          data-cyd-part={`tab-${tab}`}
          aria-selected={tab === activeTab}
          aria-controls={`${panelId}-panel`}
          tabIndex={tab === activeTab ? 0 : -1}
          onClick={() => onTabChange(tab)}
        >
          <Icon name={tab} />
          {TAB_LABELS[tab]}
          {counts?.[tab] ? <span className="cyd-tab-count">{counts[tab]}</span> : null}
        </button>
      ))}
    </div>
  );
}

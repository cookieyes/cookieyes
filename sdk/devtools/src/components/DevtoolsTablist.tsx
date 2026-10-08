"use client";

import { type KeyboardEvent, useEffect, useLayoutEffect, useRef, useState } from "react";
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
 * Tighten the tab spacing, then drop the icons, only as far as needed for the
 * tabs to fit. Measured rather
 * than a width breakpoint, because count badges ("Events 200") change how
 * much room the tabs need. Runs synchronously (layout effect or resize
 * observer), so the full-size measurement never paints.
 */
function fitTabs(list: HTMLElement): void {
  const overflows = () => list.scrollWidth > list.clientWidth + 1;
  list.removeAttribute("data-cyd-compact");
  if (!overflows()) return;
  // Tighter spacing first: it usually recovers enough, and keeps the icons.
  list.setAttribute("data-cyd-compact", "tight");
  if (overflows()) list.setAttribute("data-cyd-compact", "labels");
}

/**
 * `role="tablist"` with one `role="tab"` per {@link TabId}. Arrow-key
 * navigation (Left/Right moves focus and selects, wrapping at the ends;
 * Home/End jump to first/last) per the WAI-ARIA tabs pattern. Roving
 * tabindex: only the active tab is in the natural tab order.
 */
export function DevtoolsTablist({ activeTab, onTabChange, panelId, counts }: DevtoolsTablistProps) {
  const listRef = useRef<HTMLDivElement>(null);
  // Which ends have tabs scrolled out of view. The scrollbar is hidden, so
  // without a cue (and a way to scroll that isn't a trackpad) a narrow panel
  // left the last tabs unreachable for mouse users.
  const [overflow, setOverflow] = useState({ start: false, end: false });

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    function measure() {
      if (!list) return;
      const max = list.scrollWidth - list.clientWidth;
      setOverflow({ start: list.scrollLeft > 1, end: list.scrollLeft < max - 1 });
    }
    function fitAndMeasure() {
      if (list) fitTabs(list);
      measure();
    }
    // A plain mouse wheel only scrolls vertically; turn it sideways here.
    // Native and non-passive so the page doesn't scroll as well.
    function onWheel(event: WheelEvent) {
      if (!list || Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
      if (list.scrollWidth <= list.clientWidth) return;
      event.preventDefault();
      list.scrollLeft += event.deltaY;
    }
    fitAndMeasure();
    list.addEventListener("scroll", measure, { passive: true });
    list.addEventListener("wheel", onWheel, { passive: false });
    const observer =
      typeof ResizeObserver !== "undefined" ? new ResizeObserver(fitAndMeasure) : undefined;
    observer?.observe(list);
    return () => {
      list.removeEventListener("scroll", measure);
      list.removeEventListener("wheel", onWheel);
      observer?.disconnect();
    };
  }, []);

  // Count badges change the tabs' width; refit before paint so it never flickers.
  const countsKey = TAB_IDS.map((tab) => counts?.[tab] ?? 0).join(",");
  // biome-ignore lint/correctness/useExhaustiveDependencies: countsKey is the signal that tab widths changed
  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list) return;
    fitTabs(list);
    // The list's own box doesn't change size when its tabs grow, so the resize
    // observer won't re-measure the arrows; do it here.
    const max = list.scrollWidth - list.clientWidth;
    setOverflow({ start: list.scrollLeft > 1, end: list.scrollLeft < max - 1 });
  }, [countsKey]);

  // Keep the selected tab in view. Scrolls only the tablist, never the page or
  // the panel body, which `scrollIntoView` could also move.
  useEffect(() => {
    const list = listRef.current;
    const tab = list?.querySelector<HTMLElement>(`[data-cyd-part="tab-${activeTab}"]`);
    if (!list || !tab) return;
    const left = tab.offsetLeft - list.offsetLeft;
    const right = left + tab.offsetWidth;
    if (left < list.scrollLeft) list.scrollLeft = left - 24;
    else if (right > list.scrollLeft + list.clientWidth) {
      list.scrollLeft = right - list.clientWidth + 24;
    }
  }, [activeTab]);

  function scrollBy(direction: 1 | -1) {
    const list = listRef.current;
    if (!list) return;
    list.scrollBy?.({ left: direction * list.clientWidth * 0.6, behavior: "smooth" });
  }
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
      className="cyd-tabbar"
      data-cyd-overflow-start={overflow.start || undefined}
      data-cyd-overflow-end={overflow.end || undefined}
    >
      {overflow.start ? (
        <button
          type="button"
          className="cyd-tabbar-scroll cyd-tabbar-scroll-start"
          data-cyd-part="tabs-scroll-start"
          aria-label="Show earlier tabs"
          tabIndex={-1}
          onClick={() => scrollBy(-1)}
        >
          ‹
        </button>
      ) : null}
      <div
        ref={listRef}
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
      {overflow.end ? (
        <button
          type="button"
          className="cyd-tabbar-scroll cyd-tabbar-scroll-end"
          data-cyd-part="tabs-scroll-end"
          aria-label="Show more tabs"
          tabIndex={-1}
          onClick={() => scrollBy(1)}
        >
          ›
        </button>
      ) : null}
    </div>
  );
}

"use client";

import {
  type KeyboardEvent,
  type ReactNode,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Icon } from "./Icon.js";

/** One choice in a {@link Combobox}. */
export type ComboboxOption = {
  value: string;
  label: string;
  /** Options sharing a group render under one heading, in first-seen order. */
  group?: string | undefined;
  /** Shown before the label, e.g. a flag. */
  leading?: ReactNode;
  /** Short trailing text, e.g. the regulation a region maps to. */
  badge?: string | undefined;
  /** Extra words the search matches but doesn't display (codes, native names). */
  keywords?: string | undefined;
};

export type ComboboxProps = {
  /** `data-cyd-part` prefix for the trigger, search box and options. */
  part: string;
  label: string;
  value: string | undefined;
  options: ComboboxOption[];
  onChange: (value: string) => void;
  /** Trigger text when nothing is selected. */
  placeholder: string;
  searchPlaceholder: string;
  /**
   * Turns search text the list doesn't contain into a choosable value (e.g.
   * a region code like "US-TX"), or returns `undefined` when it isn't valid.
   */
  toCustomValue?: ((query: string) => string | undefined) | undefined;
};

const MAX_LIST_HEIGHT = 280;
/** Below this the list is too short to use; open on the other side if it has more room. */
const MIN_LIST_HEIGHT = 120;
/** The search row above the list, plus borders. */
const SEARCH_HEIGHT = 40;
/** Space kept between the popover and the trigger or the panel edge. */
const GAP = 4;

function matches(option: ComboboxOption, query: string): boolean {
  const haystack = `${option.label} ${option.value} ${option.keywords ?? ""}`.toLowerCase();
  return query
    .toLowerCase()
    .split(/\s+/)
    .every((word) => haystack.includes(word));
}

/**
 * A searchable select: a button showing the current value that opens a
 * filterable, grouped listbox (ARIA combobox pattern). A native `<select>`
 * can't search or group with badges, and a `<datalist>` hides its options
 * until you type — the reason the region picker was hard to use.
 *
 * The popover is `position: fixed`, measured from the trigger, so the panel
 * body's scroll container can't clip it. It stays inside the devtools panel's
 * body: it opens on whichever side of the trigger has more room there, and
 * its list shrinks (and scrolls) to fit, rather than spilling over the panel.
 */
export function Combobox({
  part,
  label,
  value,
  options,
  onChange,
  placeholder,
  searchPlaceholder,
  toCustomValue,
}: ComboboxProps) {
  const id = useId();
  const listId = `${id}-list`;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [rect, setRect] = useState<{
    left: number;
    width: number;
    top?: number;
    bottom?: number;
    listHeight: number;
  }>();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const selected = options.find((option) => option.value === value);

  const visible = useMemo(() => {
    const filtered = query.trim() ? options.filter((o) => matches(o, query.trim())) : options;
    const custom = toCustomValue?.(query.trim());
    if (custom && !options.some((o) => o.value === custom)) {
      return [{ value: custom, label: `Use “${custom}”`, group: "Custom" }, ...filtered];
    }
    return filtered;
  }, [options, query, toCustomValue]);

  useLayoutEffect(() => {
    if (!open) return;
    function place() {
      const trigger = triggerRef.current;
      const box = trigger?.getBoundingClientRect();
      if (!trigger || !box) return;
      // The panel's scrolling body is the area to stay inside; fall back to the
      // viewport when the combobox is rendered outside a panel.
      const bounds = trigger.closest(".cyd-panel-body")?.getBoundingClientRect() ?? {
        top: 0,
        bottom: window.innerHeight,
      };
      // Scrolled out of the panel body: close rather than float over the edge.
      if (box.bottom < bounds.top || box.top > bounds.bottom) {
        setOpen(false);
        return;
      }
      const roomBelow = bounds.bottom - box.bottom - GAP * 2 - SEARCH_HEIGHT;
      const roomAbove = box.top - bounds.top - GAP * 2 - SEARCH_HEIGHT;
      const below = roomBelow >= MIN_LIST_HEIGHT || roomBelow >= roomAbove;
      const listHeight = Math.max(
        0,
        Math.min(MAX_LIST_HEIGHT, Math.floor(below ? roomBelow : roomAbove)),
      );
      setRect(
        below
          ? { left: box.left, width: box.width, top: box.bottom + GAP, listHeight }
          : {
              left: box.left,
              width: box.width,
              bottom: window.innerHeight - box.top + GAP,
              listHeight,
            },
      );
    }
    place();
    // Capture phase: the panel body scrolls, not the window.
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    return () => {
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (popoverRef.current?.contains(target) || triggerRef.current?.contains(target)) return;
      setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  useEffect(() => {
    listRef.current
      ?.querySelector(`[data-index="${active}"]`)
      ?.scrollIntoView?.({ block: "nearest" });
  }, [active]);

  function openList() {
    setQuery("");
    const index = options.findIndex((option) => option.value === value);
    setActive(index === -1 ? 0 : index);
    setOpen(true);
  }

  function choose(option: ComboboxOption | undefined) {
    if (!option) return;
    onChange(option.value);
    setOpen(false);
    triggerRef.current?.focus();
  }

  function onSearchKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((i) => Math.min(i + 1, visible.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (event.key === "Home") {
      event.preventDefault();
      setActive(0);
    } else if (event.key === "End") {
      event.preventDefault();
      setActive(visible.length - 1);
    } else if (event.key === "Enter") {
      event.preventDefault();
      choose(visible[active]);
    } else if (event.key === "Escape") {
      // Stop here: Escape at document level closes the whole panel.
      event.preventDefault();
      event.stopPropagation();
      setOpen(false);
      triggerRef.current?.focus();
    } else if (event.key === "Tab") {
      setOpen(false);
    }
  }

  let lastGroup: string | undefined;

  return (
    <div className="cyd-combo">
      <span className="cyd-field-label" id={`${id}-label`}>
        {label}
      </span>
      <button
        ref={triggerRef}
        type="button"
        className="cyd-combo-trigger"
        data-cyd-part={`${part}-trigger`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-labelledby={`${id}-label ${id}-value`}
        onClick={() => (open ? setOpen(false) : openList())}
        onKeyDown={(event) => {
          if (!open && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
            event.preventDefault();
            openList();
          }
        }}
      >
        {selected?.leading ? <span className="cyd-combo-leading">{selected.leading}</span> : null}
        <span
          id={`${id}-value`}
          className={
            selected || value ? "cyd-combo-value" : "cyd-combo-value cyd-combo-placeholder"
          }
        >
          {selected?.label ?? value ?? placeholder}
        </span>
        {selected?.badge ? <span className="cyd-combo-badge">{selected.badge}</span> : null}
        <svg className="cyd-combo-caret" viewBox="0 0 16 16" aria-hidden="true">
          <path d="M4.5 6.5 8 10l3.5-3.5" fill="none" stroke="currentColor" strokeWidth="1.4" />
        </svg>
      </button>
      {open && rect ? (
        <div
          ref={popoverRef}
          className="cyd-combo-popover"
          data-cyd-part={`${part}-popover`}
          style={{ left: rect.left, width: rect.width, top: rect.top, bottom: rect.bottom }}
        >
          <div className="cyd-combo-search">
            <Icon name="search" />
            <input
              // biome-ignore lint/a11y/noAutofocus: the popover opens on a click meant to search; focus belongs in the search box
              autoFocus
              role="combobox"
              aria-expanded="true"
              aria-controls={listId}
              aria-autocomplete="list"
              aria-activedescendant={visible[active] ? `${id}-opt-${active}` : undefined}
              aria-label={searchPlaceholder}
              data-cyd-part={`${part}-search`}
              placeholder={searchPlaceholder}
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setActive(0);
              }}
              onKeyDown={onSearchKeyDown}
            />
          </div>
          <div
            ref={listRef}
            id={listId}
            role="listbox"
            aria-labelledby={`${id}-label`}
            className="cyd-combo-list"
            style={{ maxHeight: rect.listHeight }}
          >
            {visible.length === 0 ? (
              <div className="cyd-combo-empty">No matches</div>
            ) : (
              visible.map((option, index) => {
                const heading =
                  option.group !== undefined && option.group !== lastGroup ? option.group : null;
                lastGroup = option.group;
                return (
                  <div key={`${option.group ?? ""}:${option.value}`}>
                    {heading ? (
                      <div className="cyd-combo-group" role="presentation">
                        {heading}
                      </div>
                    ) : null}
                    <div
                      id={`${id}-opt-${index}`}
                      role="option"
                      tabIndex={-1}
                      aria-selected={option.value === value}
                      data-index={index}
                      data-cyd-part={`${part}-option`}
                      data-value={option.value}
                      className={
                        index === active ? "cyd-combo-option cyd-combo-active" : "cyd-combo-option"
                      }
                      onPointerMove={() => setActive(index)}
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => choose(option)}
                      onKeyDown={() => undefined}
                    >
                      {option.leading ? (
                        <span className="cyd-combo-leading">{option.leading}</span>
                      ) : null}
                      <span className="cyd-combo-label">{option.label}</span>
                      {option.badge ? (
                        <span className="cyd-combo-badge">{option.badge}</span>
                      ) : null}
                      {option.value === value ? (
                        <svg className="cyd-combo-check" viewBox="0 0 16 16" aria-hidden="true">
                          <path
                            d="M3.5 8.5 6.5 11.5 12.5 5"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.6"
                          />
                        </svg>
                      ) : null}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

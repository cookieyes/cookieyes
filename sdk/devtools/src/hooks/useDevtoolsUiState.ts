"use client";

import { useCallback, useState } from "react";
import { readLocalStorageJson, writeLocalStorageJson } from "../lib/storage.js";
import { type DevtoolsPosition, type DevtoolsUiState, TAB_IDS, type TabId } from "../types.js";

const STORAGE_KEY = "cyd:ui";

function isTabId(value: unknown): value is TabId {
  return typeof value === "string" && (TAB_IDS as string[]).includes(value);
}

function isPosition(value: unknown): value is DevtoolsPosition {
  return (
    value === "top-left" ||
    value === "top-right" ||
    value === "bottom-left" ||
    value === "bottom-right"
  );
}

function loadInitial(defaultPosition: DevtoolsPosition): DevtoolsUiState {
  const stored = readLocalStorageJson<Partial<DevtoolsUiState>>(STORAGE_KEY);
  return {
    open: stored?.open === true,
    activeTab: isTabId(stored?.activeTab) ? stored.activeTab : "consent",
    // The prop is the default, not a floor — a stored position (the user
    // dragged/reselected a corner) wins over it across reloads.
    position: isPosition(stored?.position) ? stored.position : defaultPosition,
  };
}

/**
 * UI chrome state (open / active tab / position), persisted to and rehydrated
 * from `localStorage["cyd:ui"]`. Lazily initialised from storage so the panel
 * doesn't flash from a default state to a stored one after mount.
 */
export function useDevtoolsUiState(defaultPosition: DevtoolsPosition) {
  const [state, setState] = useState<DevtoolsUiState>(() => loadInitial(defaultPosition));

  const persist = useCallback((next: DevtoolsUiState) => {
    setState(next);
    writeLocalStorageJson(STORAGE_KEY, next);
  }, []);

  const setOpen = useCallback((open: boolean) => persist({ ...state, open }), [state, persist]);
  const toggleOpen = useCallback(() => persist({ ...state, open: !state.open }), [state, persist]);
  const setActiveTab = useCallback(
    (activeTab: TabId) => persist({ ...state, activeTab }),
    [state, persist],
  );
  const setPosition = useCallback(
    (position: DevtoolsPosition) => persist({ ...state, position }),
    [state, persist],
  );

  return { state, setOpen, toggleOpen, setActiveTab, setPosition };
}

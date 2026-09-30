"use client";

import { useCallback, useState } from "react";
import { readLocalStorage, removeLocalStorage, writeLocalStorage } from "../lib/storage.js";
import type { DevtoolsTheme } from "../types.js";

const STORAGE_KEY = "cyd:theme";

function isTheme(value: unknown): value is DevtoolsTheme {
  return value === "light" || value === "dark" || value === "system";
}

/**
 * The panel's colour scheme. `choice` is what the header switch shows and is
 * persisted to `localStorage["cyd:theme"]`; `"system"` (the default) clears it.
 * `resolved` is what the root actually applies: an explicit light/dark choice,
 * otherwise the host's `theme` prop, otherwise `"system"` (the OS preference,
 * handled in CSS by `prefers-color-scheme`).
 */
export function useDevtoolsTheme(hostTheme: DevtoolsTheme | undefined) {
  const [choice, setChoice] = useState<DevtoolsTheme>(() => {
    const stored = readLocalStorage(STORAGE_KEY);
    return isTheme(stored) ? stored : "system";
  });

  const setTheme = useCallback((next: DevtoolsTheme) => {
    setChoice(next);
    if (next === "system") removeLocalStorage(STORAGE_KEY);
    else writeLocalStorage(STORAGE_KEY, next);
  }, []);

  const resolved: DevtoolsTheme = choice !== "system" ? choice : (hostTheme ?? "system");
  return { choice, resolved, setTheme };
}

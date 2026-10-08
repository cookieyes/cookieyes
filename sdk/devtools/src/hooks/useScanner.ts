"use client";

import type { CookieYesRuntime } from "@cookieyes/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { readLocalStorageJson, writeLocalStorageJson } from "../lib/storage.js";
import {
  advanceTimeline,
  type ConsentTimeline,
  classify,
  type Finding,
  type ManagedResource,
} from "../scanner/classify.js";
import { createCollector, pageStartedAt } from "../scanner/collector.js";
import { createVendorLookup } from "../scanner/vendors.js";

const DISMISSED_KEY = "cyd:scanner-dismissed";
const vendors = createVendorLookup();

type DevGlobal = typeof globalThis & {
  __COOKIEYES_DEVTOOLS__?: { k: string; t: number }[];
};

/**
 * When the latest consent save happened. Core pushes the `"c"` entry before
 * the save's side effects run, and so before any script it injects; listeners
 * hear about the save later, after those scripts are already on the page.
 * Timing the grant from the listener would make every managed script look
 * like it loaded a millisecond before consent. Not every change pushes one
 * (`resetConsent` doesn't), so a save entry is used once, and a change without
 * a new one is timed from the listener.
 */
function latestSaveTime(): number | undefined {
  const queue = (globalThis as DevGlobal).__COOKIEYES_DEVTOOLS__ ?? [];
  for (let i = queue.length - 1; i >= 0; i--) {
    const entry = queue[i];
    if (entry?.k === "c") return entry.t;
  }
  return undefined;
}

/**
 * Runs the scanner for as long as the panel is mounted, open or not, so first
 * sightings are timed from page load rather than from when the tab was opened.
 * Tracks when each category was first granted (from the committed consent the
 * runtime reports) and the developer's dismissals, which persist in
 * localStorage so a known, accepted finding stays quiet across reloads.
 */
export function useScanner(runtime: CookieYesRuntime | null, managed: ManagedResource[]) {
  const [version, setVersion] = useState(0);
  const [timeline, setTimeline] = useState<ConsentTimeline>({});
  const [dismissed, setDismissed] = useState<string[]>(
    () => readLocalStorageJson<string[]>(DISMISSED_KEY) ?? [],
  );
  const collector = useRef<ReturnType<typeof createCollector> | undefined>(undefined);
  collector.current ??= createCollector({ onChange: () => setVersion((v) => v + 1) });

  useEffect(() => {
    const c = collector.current;
    c?.start();
    return () => c?.stop();
  }, []);

  useEffect(() => {
    if (!runtime) return;
    // Consent already committed when the runtime came up (a returning visitor,
    // or a category granted by default under CCPA) counts from page load.
    const origin = pageStartedAt();
    setTimeline((t) => advanceTimeline(t, runtime.getSnapshot().committedCategories, origin));
    let usedSave = latestSaveTime() ?? 0;
    return runtime.subscribe(() => {
      const save = latestSaveTime();
      const fresh = save !== undefined && save > usedSave;
      if (fresh) usedSave = save;
      const at = fresh ? save : Date.now();
      // Before recording the change: cookies already here were set before it,
      // even if the 2-second poll hasn't noticed them yet.
      collector.current?.syncStores(at - 1);
      setTimeline((t) => advanceTimeline(t, runtime.getSnapshot().committedCategories, at));
    });
  }, [runtime]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: `version` is the signal that the collector's observations changed
  const findings = useMemo<Finding[]>(
    () => classify(collector.current?.list() ?? [], managed, timeline, vendors),
    [version, managed, timeline],
  );

  const dismiss = useCallback((key: string) => {
    setDismissed((prev) => {
      const next = prev.includes(key) ? prev : [...prev, key];
      writeLocalStorageJson(DISMISSED_KEY, next);
      return next;
    });
  }, []);

  const restore = useCallback((key: string) => {
    setDismissed((prev) => {
      const next = prev.filter((k) => k !== key);
      writeLocalStorageJson(DISMISSED_KEY, next);
      return next;
    });
  }, []);

  const rescan = useCallback(() => collector.current?.rescan(), []);

  return { findings, dismissed, dismiss, restore, rescan };
}

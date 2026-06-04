"use client";

import type { ConsentCategory, ScriptEntry } from "@cookieyes/core";
import { useEffect } from "react";
import { _tryGetCookieYes } from "../runtime.js";

type Props = {
  src: string;
  category: ConsentCategory;
  id: string;
  strategy?: "afterConsent" | "lazyOnce";
  onLoad?: () => void;
};

export function GatedScript({ src, category, id, strategy = "afterConsent", onLoad }: Props): null {
  useEffect(() => {
    const runtime = _tryGetCookieYes();
    if (!runtime) return;
    const entry: ScriptEntry = {
      id,
      src,
      category,
      strategy,
      ...(onLoad !== undefined ? { onLoad } : {}),
    };
    runtime.registerScript(entry);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, src, category, strategy]);
  return null;
}

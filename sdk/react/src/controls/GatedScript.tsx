"use client";

import type { ConsentCategory, ScriptEntry } from "@cookieyes/core";
import { useEffect } from "react";
import { _tryGetCookieYes } from "../runtime.js";

export type GatedScriptProps = {
  src: string;
  category: ConsentCategory;
  id: string;
  onLoad?: () => void;
};

export function GatedScript({ src, category, id, onLoad }: GatedScriptProps): null {
  useEffect(() => {
    const runtime = _tryGetCookieYes();
    if (!runtime) return;
    const entry: ScriptEntry = {
      id,
      src,
      category,
      ...(onLoad !== undefined ? { onLoad } : {}),
    };
    runtime.registerScript(entry);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, src, category]);
  return null;
}

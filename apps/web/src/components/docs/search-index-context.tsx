"use client";

import { createContext, type ReactNode, useContext } from "react";
import type { SearchIndexEntry } from "@/lib/search-index";

const SearchIndexContext = createContext<SearchIndexEntry[]>([]);

/**
 * Carries the server-built page index to the search dialog.
 *
 * RootProvider's `search.options` would also reach the dialog — it spreads them as
 * props — but that field is typed against Fumadocs' own dialog, so extra props only
 * pass with a cast. Context keeps it typed end to end.
 */
export function SearchIndexProvider({
  value,
  children,
}: {
  value: SearchIndexEntry[];
  children: ReactNode;
}) {
  return <SearchIndexContext value={value}>{children}</SearchIndexContext>;
}

export function useSearchIndex(): SearchIndexEntry[] {
  return useContext(SearchIndexContext);
}

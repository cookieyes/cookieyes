"use client";

import { RootProvider } from "fumadocs-ui/provider/next";
import type { ReactNode } from "react";
import { SearchDialog } from "@/components/docs/SearchDialog";
import { SearchIndexProvider } from "@/components/docs/search-index-context";
import type { SearchIndexEntry } from "@/lib/search-index";

/**
 * App-wide providers.
 *
 * This exists as a client boundary so the custom search dialog can be handed to
 * RootProvider: a component type cannot cross from a server layout, but the page
 * index it needs is plain data and does.
 */
export function Providers({
  pageIndex,
  children,
}: {
  pageIndex: SearchIndexEntry[];
  children: ReactNode;
}) {
  return (
    <SearchIndexProvider value={pageIndex}>
      <RootProvider search={{ SearchDialog }}>{children}</RootProvider>
    </SearchIndexProvider>
  );
}

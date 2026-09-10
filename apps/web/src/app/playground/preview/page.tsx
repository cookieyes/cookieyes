import type { Metadata } from "next";
import { PreviewApp } from "@/components/playground/PreviewApp";

/**
 * The document loaded into the playground's iframe.
 *
 * A separate document is what makes the preview real: the consent runtime is a module
 * singleton and every banner and dialog portals to `document.body`, so an in-page preview
 * would collide with the site itself. Here it gets its own registry and its own body, and
 * imports the same package a visitor would.
 */
export const metadata: Metadata = {
  title: "Banner preview",
  robots: { index: false, follow: false },
};

export default function PlaygroundPreviewPage() {
  return <PreviewApp />;
}

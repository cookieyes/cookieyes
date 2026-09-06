import type { Metadata } from "next";
import { PlaygroundSandbox } from "@/components/playground/PlaygroundSandbox";
// The SDK's own manifest, so the version shown can never drift from the one being built
// against. Imported rather than read at runtime: the bundler inlines it here, whereas a
// server-side file read resolves to a virtual path that does not exist on disk. The
// package does not export `./package.json`, hence the relative path.
import sdkManifest from "../../../../../sdk/react/package.json";

export const metadata: Metadata = {
  title: "Playground — CookieYes for Developers",
  description:
    "Change the banner's colours, wording and categories, watch it update live, and copy the setup code. No install, no account.",
};

export default function PlaygroundPage() {
  return (
    <div className="cy-page cy-light cy-nolines">
      <main className="cy-pg-main">
        <header className="cy-pg-intro">
          <h1>Playground</h1>
          <p>
            Try the banner before you install it. Change the settings, use the banner the way a
            visitor would, then copy the setup.
          </p>
        </header>
        <PlaygroundSandbox version={sdkManifest.version} />
      </main>
    </div>
  );
}

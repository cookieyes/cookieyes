// matrix/example-app/app/layout.tsx
//
// Exercises `await cookies()` (via getServerConsent, sdk/nextjs/src/server.ts)
// on whichever Next version this combination installed. See
// ai-context/designs/peer-dependency-matrix.md §5.2, §5.4 (Test A).

import { CookieYesProvider } from "@cookieyes/nextjs";
import { getServerConsent } from "@cookieyes/nextjs/server";
import type { ReactNode } from "react";
import { ClientConsent } from "./client-consent";

// Required: the SDK ships no inline styling.
import "@cookieyes/react/styles.css";

export const metadata = { title: "peer-matrix example app" };

export default async function RootLayout({ children }: { children: ReactNode }) {
  const initialConsent = await getServerConsent({ regulation: "GDPR" });
  return (
    <html lang="en">
      <body>
        <CookieYesProvider regulation="GDPR" initialConsent={initialConsent}>
          <ClientConsent initialConsent={initialConsent} />
          {children}
        </CookieYesProvider>
      </body>
    </html>
  );
}

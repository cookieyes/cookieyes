import type { Metadata } from "next";
import type { ReactNode } from "react";
import { CookieYesRoot } from "@/app/components/consent-manager";

export const metadata: Metadata = {
  title: "benchmark",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        {children}
        <CookieYesRoot />
      </body>
    </html>
  );
}

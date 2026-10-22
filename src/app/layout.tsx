import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GarbaMatch — Find your rhythm",
  description: "Meet your campus people for Garba. Find your rhythm, find your people.",
  applicationName: "GarbaMatch",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#4c183a",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <ClerkProvider>
          {children}
        </ClerkProvider>
      </body>
    </html>
  );
}
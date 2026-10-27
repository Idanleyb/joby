import type { Metadata, Viewport } from "next";
// Heebo is self-hosted from npm (no build-time call to Google Fonts).
import "@fontsource-variable/heebo";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = {
  title: "Joby — המרקטפלייס של המילואים",
  description: "מילואימניקים מאומתים ובני הזוג שלהם מציעים שירותים. כל אחד יכול לפרסם עבודה.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="he" dir="rtl">
      <body className="font-sans antialiased">
        <SiteHeader />
        {children}
      </body>
    </html>
  );
}

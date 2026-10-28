import type { Metadata, Viewport } from "next";
// Fonts are self-hosted from npm (no build-time call to Google Fonts): Heebo for text, Rubik for headings.
import "@fontsource-variable/heebo";
import "@fontsource-variable/rubik";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";
import { AppNav } from "@/components/app-nav";
import { FeedbackBanner } from "@/components/feedback-banner";

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
        <FeedbackBanner />
        <div className="flex">
          <AppNav />
          <div className="min-w-0 flex-1 pb-20 md:pb-0">{children}</div>
        </div>
      </body>
    </html>
  );
}
